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

  var newEvaluation = {
    "id": uuid.v4(),
    "userId": event.userId,
    "biddingId": event.biddingId,
    "contributionId": event.contributionId,
    "createdAt": Date.now()
  };
  var params = {
    TableName : tableName,
    Item: newEvaluation
  };
  function response() {
    return cb(null, newEvaluation);
  }
  dynamodbDocClient.put(params, response);
};

module.exports.getEvaluation = function(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };

  return dynamodbDocClient.get(params, cb);
};

module.exports.deleteEvaluation = function(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };
  function response() {
    return cb(null, params.Key);
  }
  return dynamodbDocClient.delete(params, response);
};
