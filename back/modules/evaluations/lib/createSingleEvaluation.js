'use strict';

/**
 * Serverless Module: Lambda Handler
 * - Your lambda functions should be a thin wrapper around your own separate
 * modules, to keep your code testable, reusable and AWS independent
 * - 'serverless-helpers-js' module is required for Serverless ENV var support.  Hopefully, AWS will add ENV support to Lambda soon :)
 */

// Require Serverless ENV vars
var ServerlessHelpers = require('serverless-helpers-js').loadEnv();

// Require Logic

var _    = require('underscore');
var AWS  = require('aws-sdk');
var lambda = new AWS.Lambda({
  region: process.env.AWS_REGION
});
var uuid = require('node-uuid');
var Immutable = require('immutable');
var immutableMap = Immutable.Map({ totalEvaluatorsRepBefore: 0 });
var async = require('async');
var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-evaluations-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var usersTableName = 'slant-users-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var contributionsTableName = 'slant-contributions-' + process.env.SERVERLESS_DATA_MODEL_STAGE;

var cachingTableName = 'slant-caching-' + process.env.SERVERLESS_DATA_MODEL_STAGE;

var log = log('CREATE SINGLE');

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
          getTotalRep(parallelCB);
        },
        evaluations: function(parallelCB) {
          getEvaluations(event.contributionId, parallelCB);
        }
      },
        function(err, results) {
          totalRepInSystem = results.totalRepInSystem;
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
      immutableMap = immutableMap.set('totalEvaluatorsRepBefore', calcTotalEvaluatorsRep(evaluators));
      evaluators = addVoteValueToEvaluators(evaluators, evaluations);
      totalVoteRep = getTotalEvaluatorsWhoVotedSameRep(evaluators, event.value);
      currentUser = getCurrentUserFrom(evaluators, event.userId);
      currentUserRep = currentUser.reputation;
      totalContributionRep = sumRepOf(evaluators);
      log("totalContributionRep", totalContributionRep);
      evaluators = updateEvaluatorsRepForSameVoters(evaluators, currentUserRep, totalRepInSystem, totalContributionRep, totalVoteRep, event.value, event.userId);
      evaluators = updateEvaluatorsRep(evaluators, currentUserRep, totalRepInSystem);

      async.parallel({
        updateEvaluatorsRepToDb: function(parallelCB) {
          updateEvaluatorsRepToDb(evaluators, parallelCB);
        },
        cacheNewTotalRepToDb: function(parallelCB) {
          cacheNewTotalReputationToDb(evaluators, parallelCB);
        }
      },
        function(err, results) {
          if (err) { log('err', err); } 
          else {     log('results', results); }

          var endTime = new Date().getTime();
          log('total time', endTime - startTime);
          return cb(err, 'done');
        }
      );
      
    }

  ]);

}

function sumRepOf(evaluators) {
  return _.reduce(evaluators, function(memo, evaluator){ 
    return memo + evaluator.reputation;
  }, 0);
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
    TableName: usersTableName,
    RequestItems: {},
    ReturnConsumedCapacity: 'NONE',
    ReturnItemCollectionMetrics: 'NONE'
  };
  var submittedEvaluators = [];
  _.each(evaluators, function(evaluator) {
    var dbEvaluatorsWrapper = {
      PutRequest: {
        Item: evaluator
      }
    };
    submittedEvaluators.push(dbEvaluatorsWrapper);
  });

  params.RequestItems[usersTableName] = submittedEvaluators;
  dynamodbDocClient.batchWrite(params, function(err, data) {
    callback(err, data);
  });
}

function calcTotalEvaluatorsRep(evaluators) {
  return _.reduce(evaluators, function(memo, evaluator) {
    return memo + evaluator.reputation;
  }, 0);
}

function cacheNewTotalReputationToDb(evaluators, callback) {
  var before = immutableMap.get('totalEvaluatorsRepBefore');
  var after = calcTotalEvaluatorsRep(evaluators);
  var diff = after - before;
  log('total evaluators rep: before', before, 'after', after, 'diff', diff);
  
  var params = {
    TableName: cachingTableName,
    Key: { type: "totalRepInSystem" },
    UpdateExpression: 'set #val = #val + :v',
    ExpressionAttributeNames: { '#val' : 'theValue' },
    ExpressionAttributeValues: { ':v' : diff },
    ReturnValues: 'ALL_NEW'
  };

  return dynamodbDocClient.update(params, function(err, data) {
    return callback(err, data);
  });
}

function log(prefix) {

  return function() {
    console.log('***************** ' + 'EVALUATIONS: ' + prefix + ' *******************');
    _.each(arguments, function(msg, i) { console.log(msg); });
    console.log('***************** /' + 'EVALUATIONS: ' + prefix + ' *******************');
    console.log('\n');
  };

}

function getEvaluations(contributionId, cb) {
  var paramsForQueringEvaluations = {
    TableName : tableName,
    IndexName: 'contributionId-index',
    KeyConditionExpression: 'contributionId = :hkey',
    ExpressionAttributeValues: { ':hkey': contributionId }
  };
  dynamodbDocClient.query(paramsForQueringEvaluations, function(err, data) {
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

  params.RequestItems[usersTableName] = {
    Keys: Keys
  };

  dynamodbDocClient.batchGet(params, function(err, data) {
    return cb(err, data.Responses[usersTableName]);
  });
}


function getTotalRep(callback) {

  var params = {
    TableName : cachingTableName,
    Key: { type: "totalRepInSystem" }
  };

  return dynamodbDocClient.get(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return callback(err);
    }
    return callback(err, data.Item.theValue);
  });
}