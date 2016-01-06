'use strict';

var ServerlessHelpers = require('serverless-helpers-js').loadEnv();
var _    = require('underscore');
var async = require('async');
var util = require('../../util');
var Immutable = require('immutable');
var immutableMap = Immutable.Map({ totalEvaluatorsRepBefore: 0 });
var log = util.log('CREATE SINGLE');

var stake = 0.05;
var alpha = 0.5;
var beta = 0.7;

// Lambda Handler
module.exports.execute = function(event, cb) {

  var startTime = new Date().getTime();

  log('event', event);
  var currentUser;
  var currentUserRep;
  var formerEvaluations;
  var evaluations;
  var evaluators;
  var evaluatorsWhoVotedSame;
  var totalVoteRep;
  var totalRepInSystem;
  var totalContributionRep;

  async.waterfall([

    function(waterfallCB) {

      async.parallel({
        totalRepInSystem: function(parallelCB) {
          util.getCachedSystemRep(parallelCB);
        },
        evaluations: function(parallelCB) {
          getEvaluations(event.contributionId, parallelCB);
        }
      },
        function(err, results) {
          totalRepInSystem = results.totalRepInSystem;
          log('totalRepInSystem', totalRepInSystem);
          formerEvaluations = results.evaluations;

          var currentUserFormerEvaluation = _.findWhere(formerEvaluations, { userId: event.userId });

          if (!!currentUserFormerEvaluation) {
            if (currentUserFormerEvaluation.value === event.value)
              return cb(new Error('400: bad request. evalaution with same value exists'));
            log('currentUser already evaluated this contribution, removing his vote');
            formerEvaluations = _.reject(formerEvaluations, function(e) {
              return e.userId === event.userId;
            });
          }
          formerEvaluations.push(event);
          evaluations = formerEvaluations;
          log('evaluations', evaluations);
          getEvaluators(evaluations, waterfallCB);
        }
      );

    },

    function(result, waterfallCB) {
      evaluators = result;
      log('evaluators', evaluators);
      immutableMap = immutableMap.set('totalEvaluatorsRepBefore', util.sumRep(evaluators));
      evaluators = addVoteValueToEvaluators(evaluators, evaluations);
      totalVoteRep = getTotalEvaluatorsWhoVotedSameRep(evaluators, event.value);
      currentUser = getCurrentUserFrom(evaluators, event.userId);
      currentUserRep = currentUser.reputation;
      totalContributionRep = util.sumRep(evaluators);
      log("totalContributionRep", totalContributionRep);
      console.log('rep1', evaluators[currentUserRep]);
      evaluators = updateEvaluatorsRepForSameVoters(evaluators, currentUserRep, totalRepInSystem, totalContributionRep, totalVoteRep, event.value, event.userId);
      console.log('rep2', evaluators[currentUserRep]);
      evaluators = updateEvaluatorsRep(evaluators, currentUserRep, totalRepInSystem);
      console.log('rep3', evaluators[currentUserRep]);
      updateEvaluatorsRepToDb(evaluators, cb);
    }

  ]);

}

function updateEvaluatorsRep(evaluators, currentUserRep, totalRepInSystem) {
  return _.map(evaluators, function(evaluator) {
    evaluator.reputation /= (1 - stake * Math.pow(currentUserRep/totalRepInSystem, beta));
    return evaluator;
  });
}

function updateEvaluatorsRepForSameVoters(evaluators, currentUserRep, totalRepInSystem, totalContributionRep, totalVoteRep, currentEvaluationValue, currentUserId) {
  return _.map(evaluators, function(evaluator) {
    if (evaluator.id === currentUserId) {
      evaluator.reputation = currentUserRep * (1 - stake) + currentUserRep * stake * Math.pow(totalContributionRep/totalRepInSystem, alpha) * currentUserRep / totalVoteRep;
    }
    else if ( evaluator.value === currentEvaluationValue ) {
      evaluator.reputation += currentUserRep * stake * Math.pow(totalContributionRep/totalRepInSystem, alpha) * evaluator.reputation / totalVoteRep;
    }
    return evaluator;
  });
}

function addVoteValueToEvaluators(evaluators, evaluations) {
  return _.map(evaluators, function(evaluator) {
    evaluator.value = _.find(evaluations, function(evaluation) {
      return evaluation.userId === evaluator.id;
    }).value;
    
    return evaluator;
  });
}

function getTotalEvaluatorsWhoVotedSameRep(evaluators, value) {
  var toAdd = 0;
  return _.reduce(evaluators, function(memo, evaluator) {
    toAdd = evaluator.value === value ? evaluator.reputation : 0;
    return memo + toAdd;
  }, 0);
}

function burnRepForCurrentUser(currentUserRep, totalContributionRep, totalVoteRep, totalRepInSystem) {
  return currentUserRep * (1 - stake)
    + currentUserRep * stake * totalContributionRep / totalRepInSystem
    * currentUserRep / totalVoteRep;
}

function getCurrentUserFrom(evaluators, currentUserId) {
  return _.find(evaluators, function(evaluator) {
    return evaluator.id === currentUserId;
  });
}

function updateEvaluatorsRepToDb(evaluators, callback) {
  var params = {
    TableName: util.tables.users,
    RequestItems: {},
    ReturnConsumedCapacity: 'NONE',
    ReturnItemCollectionMetrics: 'NONE'
  };
  var submittedEvaluators = [];
  _.each(evaluators, function(evaluator) {
    var dbEvaluatorsWrapper = {
      PutRequest: { Item: evaluator }
    };
    submittedEvaluators.push(dbEvaluatorsWrapper);
  });

  params.RequestItems[util.tables.users] = submittedEvaluators;
  util.dynamoDoc.batchWrite(params, function(err, data) {
    callback(err, data);
  });
}

function cacheNewTotalReputationToDb(evaluators, callback) {
  var before = immutableMap.get('totalEvaluatorsRepBefore');
  var after = util.sumRep(evaluators);
  var diff = after - before;
  log('total evaluators rep: before', before, 'after', after, 'diff', diff);
  
  var params = {
    TableName: util.tables.caching,
    Key: { type: "totalRepInSystem" },
    UpdateExpression: 'set #val = #val + :v',
    ExpressionAttributeNames: { '#val' : 'theValue' },
    ExpressionAttributeValues: { ':v' : diff },
    ReturnValues: 'ALL_NEW'
  };

  return util.dynamoDoc.update(params, function(err, data) {
    return callback(err, data);
  });
}

function getEvaluations(contributionId, cb) {
  var paramsForQueringEvaluations = {
    TableName : util.tables.evaluations,
    IndexName: 'evaluations-contributionId-createdAt',
    KeyConditionExpression: 'contributionId = :hkey',
    ExpressionAttributeValues: { ':hkey': contributionId }
  };
  util.dynamoDoc.query(paramsForQueringEvaluations, function(err, data) {
    return cb(err, data.Items);
  });
}

function getEvaluators(evaluations, cb) {

  var params = {
    RequestItems: {}
  };

  var Keys = _.map(evaluations, function(evaluation) {
    return { id: evaluation.userId };
  });

  Keys = _.uniq(Keys, function(item, key, a) { 
    return item.id;
  });

  params.RequestItems[util.tables.users] = {
    Keys: Keys
  };

  util.dynamoDoc.batchGet(params, function(err, data) {
    return cb(err, data.Responses[util.tables.users]);
  });
}