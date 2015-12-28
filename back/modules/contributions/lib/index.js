'use strict';

var _    = require('underscore');
var AWS  = require('aws-sdk');
var uuid = require('node-uuid');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-contributions-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var evaluationsTableName = 'slant-evaluations-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var hLog = log('HELPERS');

module.exports = {
  createContribution: createContribution,
  getContribution: getContribution,
  getContributionEvaluations: getContributionEvaluations,
  getContributionUsers: getContributionUsers,
  deleteContribution: deleteContribution,
  log: log
}

function createContribution(event, cb) {

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
  dynamodbDocClient.put(params, function(err, data) {
    return cb(err, newContribution);
  });
}

function getContribution(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };
  return dynamodbDocClient.get(params, function(err, data) {
    return cb(err, data.Item);
  });
}

function getContributionEvaluations(event, cb) {

  var params = {
    TableName : evaluationsTableName,
    IndexName: 'contributionId-index',
    KeyConditionExpression: 'contributionId = :hkey',
    ExpressionAttributeValues: {
      ':hkey': event.id
    }
  };
  dynamodbDocClient.query(params, function(err, data) {
    return cb(err, data.Items);
  });
}

function getContributionUsers(event, cb) {

  var response = [];

  return cb(null, response);
}

function deleteContribution(event, cb) {

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
    console.log('***************** ' + 'CONTRIBUTIONS: ' + prefix + ' *******************');
    _.each(arguments, function(msg, i) { console.log(msg); });
    console.log('***************** /' + 'CONTRIBUTIONS: ' + prefix + ' *******************');
    // console.log('\n');
  };

}