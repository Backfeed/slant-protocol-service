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
var _ = require('underscore');

var usersTableName = 'slant-users-' + process.env.SERVERLESS_DATA_MODEL_STAGE;

var AWS   = require('aws-sdk');
var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);

// Lambda Handler
module.exports.handler = function(event, context) {
  console.log('event', event);

  lib.getContributions(event, function(error, contributions) {

    console.log('contributions', contributions);

    // TODO :: set users rep in same moment, not static!
    // var contributionsWithScore = _.map(contributions, function(contribution) {

    //   var paramsForQueringEvaluators = getParamsForQueringEvaluators(contribution.positiveEvaluators);

    //   dynamodbDocClient.batchGet(paramsForQueringEvaluators, function(err, data) {
    //     if (err) {
    //       console.log('contribution', contribution.id, 'err: ', err);
    //       return;
    //     }

    //     var evaluators = data.Responses[usersTableName];
    //     var score = _.reduce(evaluators, function(memo, evaluator) {
    //       memo + evaluator.reputation;
    //     });

    //     console.log('contribution', contribution.id, 'score: ', score);
    //     // contributions.score =  score;
    //   });

    // });

    console.log('contributions', contributions);
    return context.done(error, contributions);
  });
};

function getParamsForQueringEvaluators(positiveEvaluatorsIds) {

  var params = {
    RequestItems: {}
  };

  var Keys = _.map(positiveEvaluatorsIds, function(id) {
    return { id: id   }
  });

  console.log('Keys', Keys);

  params.RequestItems[usersTableName] = {
    Keys: Keys
  };

  return params;
}
