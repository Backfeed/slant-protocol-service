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

var log = log('CREATE SINGLE');


// Lambda Handler
module.exports.execute = function(event, cb) {

  var startTime = new Date().getTime();

  log('event', event);
  var currentUser;
  var currentUserRep;
  var stake = 0.05;
  var formerEvaluations;
  var evaluations;
  var evaluators;
  var evaluatorsWhoVotedSame;
  var totalVoteRep;
  var totalRepInSystem;
  var totalContributionRep;
  var totalContributionPositiveRep;

  // addCurrentUserIdToContributionVotersArray(event.contributionId, event.userId, event.value);

  async.waterfall([
    function(callback) {
      getEvaluations(event.contributionId, callback);
    },

    function(result, callback) {
      formerEvaluations = result;
      formerEvaluations.push(event);
      evaluations = formerEvaluations;
      log('evaluations', evaluations);
      getEvaluators(evaluations, callback);
    }, 

    function(result, callback) {
      evaluators = result;
      log('evaluators', evaluators)
      immutableMap = immutableMap.set('totalEvaluatorsRepBefore', calcTotalEvaluatorsRep(evaluators));
      evaluators = addVoteValueToEvaluators(evaluators, evaluations);
      totalVoteRep = getTotalEvaluatorsWhoVotedSameRep(evaluators, event.value);
      currentUser = getCurrentUserFromEvaluators(evaluators, event.userId);
      currentUserRep = currentUser.reputation;

      if (event.value) {
        addCurrentUserRepToContributionScore(event.contributionId, currentUserRep, callback);
      } else {
        callback(null, 'done');
      }
    },

    function(result, callback) {
      totalContributionRep = calcTotalContributionRep(evaluators);
      log("totalContributionRep", totalContributionRep);

      lambda.invoke({
        FunctionName: 'slant-gettotalrep'
      }, function(error, data) {
        callback(error, data);
      });
    },

    function(result, callback) {
      totalRepInSystem = parseFloat(result.Payload);
      log('totalRepInSystem', totalRepInSystem);
      
      evaluators = updateEvaluatorsRep(evaluators, stake, currentUserRep, totalRepInSystem);
      // log('evaluators with updated rep', evaluators);

      evaluators = updateEvaluatorsRepForSameVoters(evaluators, stake, currentUserRep, totalRepInSystem, totalContributionRep, totalVoteRep, event.value, event.userId);
      // log('evaluators with updated rep for same voters', evaluators);
      
      currentUser.reputation = burnRepForCurrentUser(stake, currentUserRep, totalContributionRep, totalVoteRep, totalRepInSystem);
      
      updateEvaluatorsRepToDb(evaluators, callback);
    },

    function(result, callback) {
      cacheNewTotalReputationToDb(evaluators, totalRepInSystem, callback);
    }

  ], function (err, result) {
    log('err', err, 'result', result);
    var endTime = new Date().getTime();
    log('total time', endTime - startTime);
    return cb(null, result);
  });

};

function calcTotalContributionRep(evaluators) {
  return _.reduce(evaluators, function(memo, evaluator){ 
    return memo + evaluator.reputation;
  }, 0);
}

function updateEvaluatorsRep(evaluators, stake, currentUserRep, totalRepInSystem) {
  return _.map(evaluators, function(evaluator) {
    evaluator.reputation /= (1 - stake * currentUserRep/totalRepInSystem);
    return evaluator;
  });
}

function updateEvaluatorsRepForSameVoters(evaluators, stake, currentUserRep, totalRepInSystem, totalContributionRep, totalVoteRep, currentEvaluationValue, currentUserId) {
  return _.map(evaluators, function(evaluator) {
    if (evaluator.id === currentUserId) {
      return evaluator;
    }
    if ( evaluator.value === currentEvaluationValue ) {
      evaluator.reputation += currentUserRep * stake * totalContributionRep / totalRepInSystem * evaluator.reputation / totalVoteRep;
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

function burnRepForCurrentUser(stake, currentUserRep, totalContributionRep, totalVoteRep, totalRepInSystem) {
  return currentUserRep * (1 - stake)
    + currentUserRep * stake * totalContributionRep / totalRepInSystem
    * currentUserRep / totalVoteRep;
}

function getCurrentUserFromEvaluators(evaluators, currentUserId) {
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

function cacheNewTotalReputationToDb(evaluators, totalRepInSystem, callback) {
  var before = immutableMap.get('totalEvaluatorsRepBefore');
  var after = calcTotalEvaluatorsRep(evaluators);
  var diff = after - before;
  var newTotalRepInSystem = totalRepInSystem + diff;
  log('total evaluators rep: before', before, 'after', after, 'diff', diff);
  log('totalRepInSystemBefore', totalRepInSystem, 'newTotalRepInSystem', newTotalRepInSystem);
  lambda.invoke({
    FunctionName: 'slant-cachetotalrep',
    Payload: JSON.stringify({ reputation: newTotalRepInSystem })
  }, function(error, data) {
    if (error) {
      log('cacheNewTotalReputationToDb', 'error', error);
      return callback(error);
    }
    log('cacheNewTotalReputationToDb', data.Payload);
    return callback(null, data.Payload);
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

function addCurrentUserRepToContributionScore(contributionId, currentUserRep, callback) {
  var params = {
    TableName: contributionsTableName,
    AttributeUpdates: {
      score: {
        Action: 'ADD',
        Value: currentUserRep
      }
    },
    Key: { id: contributionId },
    ReturnValues: 'ALL_NEW'
  };

  return dynamodbDocClient.update(params, function(err, data) {
    callback(err, data);
  });
}

function addCurrentUserIdToContributionVotersArray(contributionId, userId, value) {
  var params = {
    TableName: contributionsTableName,
    AttributeUpdates: {},
    Key: { id: contributionId },
    ReturnValues: 'ALL_NEW'
  };

  // store id here
  var columnName = value === 1 ? 'positiveEvaluators' : 'negativeEvaluators';
  params.AttributeUpdates[columnName] = {
    Action: 'ADD',
    Value: [userId]
  };

  // remove id here in case user voted before
  // TODO :: make it work
  // var otherColumnName = columnName === 'positiveEvaluators' ? 'negativeEvaluators' : 'positiveEvaluators';
  // params.AttributeUpdates[otherColumnName] = {
  //   Action: 'DELETE',
  //   Value: [userId]
  // };

  return dynamodbDocClient.update(params, function(err, data) {
    if (err) {
      return log("addCurrentUserIdToContributionVotersArray: err", err);
    }
    log("addCurrentUserIdToContributionVotersArray", data);
  });
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

  params.RequestItems[usersTableName] = {
    Keys: Keys
  };

  dynamodbDocClient.batchGet(params, function(err, data) {
    return cb(err, data.Responses[usersTableName]);
  });
}