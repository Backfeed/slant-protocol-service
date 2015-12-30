'use strict';

var _    = require('underscore');
var AWS  = require('aws-sdk');
var uuid = require('node-uuid');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-evaluations-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var createSingleEvaluation = require('../lib/createSingleEvaluation');
var hLog = log('HELPERS');

module.exports = {
  createEvaluation: createEvaluation,
  getEvaluation: getEvaluation,
  deleteEvaluation: deleteEvaluation,
  log: log
};

function createEvaluation(event, cb) {

  var params = {
    TableName : tableName,
    RequestItems: {},
    ReturnConsumedCapacity: 'NONE',
    ReturnItemCollectionMetrics: 'NONE'
  };

  var submittedEvaluations = [];
  event.evaluations.forEach(function(element) {
    var newEvaluation = {
      "id": element.id || uuid.v4(),
      "userId": event.userId,
      "biddingId": event.biddingId,
      "contributionId": element.contributionId,
      "value": element.value,
      "createdAt": Date.now()
    };
    createSingleEvaluation.execute(newEvaluation);
    var dbEvaluationWrapper = {
      PutRequest: {
        Item: newEvaluation
      }
    };
    submittedEvaluations.push(dbEvaluationWrapper);
  });
  params.RequestItems[tableName] = submittedEvaluations;
  dynamodbDocClient.batchWrite(params, function(err, data) {
    return cb(err, {});
  });
}

function getEvaluation(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };

  return dynamodbDocClient.get(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data.Item);
  });
}

function deleteEvaluation(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };
  return dynamodbDocClient.delete(params, function(err, data) {
    return cb(err, params.Key);
  });
}

function log(prefix) {

  return function() {
    console.log('***************** ' + 'EVALUATIONS: ' + prefix + ' *******************');
    _.each(arguments, function(msg, i) { console.log(msg); });
    console.log('***************** /' + 'EVALUATIONS: ' + prefix + ' *******************');
    // console.log('\n');
  };

}
