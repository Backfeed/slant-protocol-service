'use strict';

var  AWS     = require('aws-sdk'),
     uuid    = require('node-uuid');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-biddings-' + process.env.SERVERLESS_DATA_MODEL_STAGE;

module.exports.createBidding = function(event, cb) {

  var newBidding = {
    "id": uuid.v4(),
    "active": true,
    "createdAt": Date.now()
  };
  var params = {
    TableName : tableName,
    Item: newBidding
  };
  dynamodbDocClient.put(params, function(err, data) {
    return cb(err, newBidding);
  });
};

module.exports.getBidding = function(event, cb) {

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

module.exports.getBiddingContributions = function(event, cb) {

  var response = [];

  return cb(null, response);
};

module.exports.getBiddingUsers = function(event, cb) {

  var response = [];

  return cb(null, response);
};

module.exports.endBidding = function(event, cb) {

  var params = {
    TableName: tableName,
    Key: {
      id: event.id
    },
    UpdateExpression: 'set #act = :a, #end = :e',
    ExpressionAttributeNames: {'#act' : 'active', '#end' : 'endedAt'},
    ExpressionAttributeValues: {
      ':a' : false,
      ':e' : Date.now()
    },
    ReturnValues: 'ALL_OLD'
  };

  return dynamodbDocClient.update(params, function(err, data) {
    return cb(err, data);
  });
};

module.exports.deleteBidding = function(event, cb) {

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
