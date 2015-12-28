'use strict';

var  AWS     = require('aws-sdk'),
     uuid    = require('node-uuid');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-biddings-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var contributionsTableName = 'slant-contributions-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var usersTableName = 'slant-users-' + process.env.SERVERLESS_DATA_MODEL_STAGE;

module.exports.createBidding = function(event, cb) {

  var newBidding = {
    "id": uuid.v4(),
    "status": 'InProgress',
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

  var params = {
    TableName : contributionsTableName,
    IndexName: 'biddingId-index',
    KeyConditionExpression: 'biddingId = :hkey',
    ExpressionAttributeValues: {
      ':hkey': event.id
    }
  };
  dynamodbDocClient.query(params, function(err, data) {
    return cb(err, data.Items);
  });
};

module.exports.getBiddingUsers = function(event, cb) {

  var response = [];

  return cb(null, response);
};

module.exports.endBidding = function(event, cb) {

  // Protocol calculates the winning contribution
  var winningContribution = getWinningContribution('694d7f56-12db-450c-90aa-a278e38e96f0');

  // the callback updates the DB
  var params = {
    TableName: tableName,
    Key: {
      id: event.id
    },
    UpdateExpression: 'set #sta = :s, #win = :w, #end = :e',
    ExpressionAttributeNames: {
      '#sta' : 'status',
      '#win' : 'winningContribution',
      '#end' : 'endedAt'
    },
    ExpressionAttributeValues: {
      ':s' : 'Completed',
      ':w' : {},
      ':e' : Date.now()
    },
    ReturnValues: 'ALL_NEW'
  };

  return dynamodbDocClient.update(params, function(err, data) {
    return cb(err, data.Attributes);
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

function getWinningContribution(contributionId) {
  var params = {
    TableName : contributionTableName,
    Key: {
      id:contributionId
    }
  };
  dynamodbDocClient.get(params, function(err, data) {
    if (err) return {}; //err;
    else return data.Item;
  });
}
