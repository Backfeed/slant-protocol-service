'use strict';

var _    = require('underscore');
var AWS  = require('aws-sdk');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};

var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var cachingTableName = 'slant-caching-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var hLog = log('HELPERS');


module.exports = {
  cacheTotalRep: cacheTotalRep,
  getTotalRep: getTotalRep,
  log: log
}

function cacheTotalRep(event, cb) {

  var params = {
    TableName: cachingTableName,
    Key: { type: "totalRepInSystem" },
    UpdateExpression: 'set #val = :v',
    ExpressionAttributeNames: { '#val' : 'theValue' },
    ExpressionAttributeValues: { ':v' : event.reputation },
    ReturnValues: 'ALL_NEW'
  };

  return dynamodbDocClient.update(params, function(err, data) {
    hLog('cacheUsersReputation: CB: ', data);
    return cb(err, data);
  });
}

function getTotalRep(event, cb) {

  var params = {
    TableName : cachingTableName,
    Key: { type: "totalRepInSystem" }
  };

  return dynamodbDocClient.get(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data.Item.theValue);
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