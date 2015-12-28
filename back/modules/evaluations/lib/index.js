'use strict';

var  AWS     = require('aws-sdk'),
     uuid    = require('node-uuid');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-evaluations-' + process.env.SERVERLESS_DATA_MODEL_STAGE;

module.exports.createEvaluation = function(event, cb) {

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
      "contributionId": event.contributionId,
      "value": element.value,
      "createdAt": Date.now()
    };
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
};

module.exports.getEvaluation = function(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };

  return dynamodbDocClient.get(params, function(err, data) {
    return cb(err, data.Item);
  });
};

module.exports.deleteEvaluation = function(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };
  return dynamodbDocClient.delete(params, function(err, data) {
    return cb(err, params.Key);
  });
};
