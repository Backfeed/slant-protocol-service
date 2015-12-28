'use strict';

var  AWS     = require('aws-sdk'),
     uuid    = require('node-uuid');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-contributions-' + process.env.SERVERLESS_DATA_MODEL_STAGE;

module.exports.createContribution = function(event, cb) {

  var newContribution = {
    "id": uuid.v4(),
    "userId": event.userId,
    "biddingId": event.biddingId,
    "createdAt": Date.now()
  };
  var params = {
    TableName : tableName,
    Item: newContribution
  };
  function response() {
    return cb(null, newContribution);
  }
  dynamodbDocClient.put(params, response);
};

module.exports.getContribution = function(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };

  return dynamodbDocClient.get(params, cb);
};

module.exports.getContributionEvaluations = function(event, cb) {

  var response = [];

  return cb(null, response);
};

module.exports.getContributionUsers = function(event, cb) {

  var response = [];

  return cb(null, response);
};

module.exports.deleteContribution = function(event, cb) {

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
