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
var lib = require('../lib');

var _    = require('underscore');
var AWS  = require('aws-sdk');
var lambda = new AWS.Lambda({
  region: process.env.AWS_REGION
});
var uuid = require('node-uuid');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-evaluations-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var usersTableName = 'slant-users-' + process.env.SERVERLESS_DATA_MODEL_STAGE;

var log = lib.log('CREATE SINGLE');


// Lambda Handler
module.exports.handler = function(event, context) {
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


  var paramsForQueringEvaluations = {
    TableName : tableName,
    IndexName: 'contributionId-index',
    KeyConditionExpression: 'contributionId = :hkey',
    ExpressionAttributeValues: { ':hkey': event.contributionId }
  };

  dynamodbDocClient.query(paramsForQueringEvaluations, function(err, data) {
    if(err) {
      log('createEvaluation: get former evaluations: err: ', err);
      return;
    }

    formerEvaluations = data.Items;
    log('formerEvaluations', formerEvaluations);

    // add the evalution of current user
    formerEvaluations.push(event);
    evaluations = formerEvaluations;
    log('evaluations', evaluations);

    var paramsForQueringEvaluators = getParamsForQueringEvaluators(evaluations);

    dynamodbDocClient.batchGet(paramsForQueringEvaluators, function(err, data) {
      if (err) {
        log('createEvaluation: get former evaluators: err: ', err);
        return;
      }

      evaluators = data.Responses['slant-users-development'];
      log('evaluators: ', evaluators);

      evaluators = addVoteValueToEvaluators(evaluators, evaluations);
      log('evaluators after adding vote value: ', evaluators);

      totalVoteRep = getTotalEvaluatorsWhoVotedSameRep(evaluators, event.value);
      log('totalVoteRep', totalVoteRep);  

      currentUser = getCurrentUserFromEvaluators(evaluators, event.userId);
      log('currentUser: ', currentUser);

      currentUserRep = currentUser.reputation;

      totalContributionRep = calcTotalContributionRep(evaluators);
      log("totalContributionRep", totalContributionRep);

      lambda.invoke({
        FunctionName: 'slant-gettotalrep'
      }, function(error, data) {
        if (error) {
          log('slant-gettotalrep', 'error', error);
          return;
        }
        if(data.Payload){

          totalRepInSystem = data.Payload;
          log('totalRepInSystem', totalRepInSystem);

          evaluators = updateEvaluatorsRep(evaluators, stake, currentUserRep, totalRepInSystem);
          log('evaluators with updated rep', evaluators);

          evaluators = updateEvaluatorsRepForSameVoters(evaluators, stake, currentUserRep, totalRepInSystem, totalContributionRep, totalVoteRep, event.value, event.userId);
          log('evaluators with updated rep for same voters', evaluators);

          currentUser.reputation = burnRepForCurrentUser(stake, currentUserRep, totalContributionRep, totalVoteRep, totalRepInSystem);
          log('evaluators with updated rep for current voter', evaluators);
        }
      });
    });

    // return cb(err, data.Items);
  });

};

function getParamsForQueringEvaluators(evaluations) {

  var params = {
    RequestItems: {}
  };

  var Keys = _.map(evaluations, function(evaluation) {
    return { id: evaluation.userId };
  });

  // Keys.push({ id: evaluatorId });

  params.RequestItems[usersTableName] = {
    Keys: Keys
  };

  log('getParamsForQueringFormerEvaluators', 'keys', Keys);

  return params;
}

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