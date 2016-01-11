'use strict';

var ServerlessHelpers = require('serverless-helpers-js').loadEnv();
var _    = require('underscore');
var async = require('async');
var util = require('../../util');
var Immutable = require('immutable');
var log = util.log('CREATE SINGLE');

var stake = 0.05;
var alpha = 0.5;
var beta = 0.7;

// Lambda Handler
module.exports.execute = function(event, cb) {

  log('event', event);

  var iMap = Immutable.Map({ 
    newRep: 0,
    voteRep: 0,
    contributionRep: 0,
    systemRep: 0
  });

  var startTime = new Date().getTime();

  var evaluations;
  var evaluators;

  async.waterfall([

    function(waterfallCB) {

      async.parallel({
        systemRep: function(parallelCB) {
          util.getCachedRep(parallelCB);
        },
        evaluations: function(parallelCB) {
          getEvaluations(event.contributionId, parallelCB);
        }
      },
        function(err, results) {
          iMap = iMap.set('systemRep', results.systemRep);
          log('systemRep', iMap.get('systemRep'));
          evaluations = results.evaluations;

          var currentUserFormerEvaluation = _.findWhere(evaluations, { userId: event.userId });

          if (!!currentUserFormerEvaluation) {

            if (currentUserFormerEvaluation.value === event.value) {
              return cb(new Error('400: bad request. current user already evaluated this contribution with this value'));
            }

            log('current user already evaluated this contribution, removing his vote');
            evaluations = _.reject(evaluations, function(e) {
              return e.userId === event.userId;
            });

          }

          evaluations.push(event);
          log('evaluations', evaluations);
          getEvaluators(evaluations, waterfallCB);
        }
      );

    },

    function(result, waterfallCB) {
      evaluators = result;
      log('evaluators', evaluators);
      evaluators = addVoteValueToEvaluators(evaluators, evaluations);
      iMap = iMap.set('newRep', getCurrentUserFrom(evaluators, event.userId).reputation);
      iMap = iMap.set('voteRep', getVoteRep(evaluators, event.value));
      iMap = iMap.set('contributionRep', util.sumRep(evaluators));

      console.log('rep1', evaluators);

      evaluators = updateSameEvaluatorsRep(evaluators, iMap.get('newRep'), iMap.get('systemRep'), iMap.get('contributionRep'), iMap.get('voteRep'), event.value, event.userId);
      console.log('rep2', evaluators);

      evaluators = updateEvaluatorsRep(evaluators, iMap.get('newRep'), iMap.get('systemRep'));
      console.log('rep3', evaluators);

      evaluators = cleanupEvaluators(evaluators);

      updateEvaluatorsRepToDb(evaluators, cb);
    }

  ]);

}

function updateEvaluatorsRep(evaluators, currentUserRep, systemRep) {
  var factor = util.math.pow(util.math.divide(currentUserRep, systemRep), beta);
  var toDivide;
  return _.map(evaluators, function(evaluator) {
    toDivide = util.math.chain(1)
                          .subtract(util.math.multiply(stake, factor))
                          .done();
    evaluator.reputation = util.math.divide(evaluator.reputation, toDivide);

    return evaluator;
  });
}

function updateSameEvaluatorsRep(evaluators, newRep, systemRep, contributionRep, voteRep, currentEvaluationValue, currentUserId) {
  var toAdd;
  var factor = util.math.pow(util.math.divide(contributionRep, systemRep), alpha);
  return _.map(evaluators, function(evaluator) {

    if ( evaluator.id === currentUserId ) {
      toAdd = util.math.chain(newRep)
                        .multiply(stake)
                        .multiply(factor)
                        .multiply(evaluator.reputation)
                        .divide(voteRep)
                        .done();

      evaluator.reputation = util.math.add(burnStakeForCurrentUser(newRep), toAdd);
      console.log('toAdd', toAdd)
      console.log('evaluator.reputation', evaluator.reputation)
    }

    else if ( evaluator.value === currentEvaluationValue ) {
      toAdd = util.math.chain(newRep)
                        .multiply(stake)
                        .multiply(factor)
                        .multiply(evaluator.reputation)
                        .divide(voteRep)
                        .done();
      evaluator.reputation = util.math.add(evaluator.reputation, toAdd);
      console.log('evaluator.reputation', evaluator.reputation)
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

function getVoteRep(evaluators, value) {
  var toAdd = 0;
  return _.reduce(evaluators, function(memo, evaluator) {
    toAdd = evaluator.value === value ? evaluator.reputation : 0;
    return memo + toAdd;
  }, 0);
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

function burnStakeForCurrentUser(currentUserRep) {
  var toMultiply = util.math.subtract(1, stake);
  return util.math.multiply(currentUserRep, toMultiply);
}

function cleanupEvaluators(evaluators) {
  return _.map(evaluators, function(evaluator) {
    evaluator.reputation = util.pp(evaluator.reputation);
    evaluator = _.omit(evaluator, 'value');
    return evaluator;
  });
}