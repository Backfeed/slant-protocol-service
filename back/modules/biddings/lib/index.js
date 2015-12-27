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
  function response() {
    return cb(null, newBidding);
  }
  dynamodbDocClient.put(params, response);
};

module.exports.getBidding = function(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };

  return dynamodbDocClient.get(params, cb);
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

  var response = {
    "id": event.id,
    "contributionId": event.id,
    "active": true,
    "createdAt": Date.now(),
    "endedAt": Date.now(),
    "event": event
  };

  return cb(null, response);
};

module.exports.deleteBidding = function(event, cb) {

  var response = {
    "id": event.id
  };

  return cb(null, response);
};
