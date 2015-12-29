'use strict';

var _    = require('underscore');
var AWS  = require('aws-sdk');
var uuid = require('node-uuid');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};

var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-users-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var usersReptableName = 'slant-caching-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var contributionsTableName = 'slant-contributions-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var evaluationsTableName = 'slant-evaluations-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var hLog = log('HELPERS');

module.exports = {
  create: create,
  getUser: getUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  getUserEvaluations: getUserEvaluations,
  getUserContributions: getUserContributions,
  log: log
};

function create(event, cb) {

  var newUser = {
    "id": uuid.v4(),
    "tokens": 10,
    "reputation": 11,
    "biddingCount": 0,
    "createdAt": Date.now()
  };
  var params = {
    TableName : tableName,
    Item: newUser
  };
  dynamodbDocClient.put(params, function(err, data) {
    return cb(err, newUser);
  });
}

function getUser(event, cb) {

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

function getUserEvaluations(event, cb) {

  var params = {
    TableName : evaluationsTableName,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :hkey',
    ExpressionAttributeValues: {
      ':hkey': event.id
    }
  };
  dynamodbDocClient.query(params, function(err, data) {
    return cb(err, data.Items);
  });
}

function getUserContributions(event, cb) {

  var params = {
    TableName : contributionsTableName,
    IndexName: 'contributions-by-userId-index',
    KeyConditionExpression: 'userId = :hkey',
    ExpressionAttributeValues: {
      ':hkey': event.id
    }
  };
  dynamodbDocClient.query(params, function(err, data) {
    return cb(err, data.Items);
  });
}

function deleteUser(event, cb) {

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

function updateUser(event, cb) {

  var params = {
    TableName: tableName,
    Key: {
      id: event.id
    },
    UpdateExpression: 'set #tok = :t, #rep = :r',
    ExpressionAttributeNames: {'#tok' : 'tokens', '#rep' : 'reputation'},
    ExpressionAttributeValues: {
      ':t' : event.tokens,
      ':r' : event.reputation
    },
    ReturnValues: 'ALL_NEW'
  };

  //ConditionExpression: 'attribute_exists',
  return dynamodbDocClient.update(params, function(err, data) {
    return cb(err, data.Attributes);
  });
}

function log(prefix) {

  return function() {
    console.log('***************** ' + 'USERS: ' + prefix + ' *******************');
    _.each(arguments, function(msg, i) { console.log(msg); });
    console.log('***************** /' + 'USERS: ' + prefix + ' *******************');
    console.log('\n');
  };

}
