'use strict';

var _ = require('underscore');
var AWS = require('aws-sdk');
var uuid = require('node-uuid');

var util = {
  tables: getTables(),
  getCachedSystemRep: getCachedSystemRep,
  dynamoDoc: getDynamoDoc(),
  uuid: uuid.v4,
  sumRep: sumRep,
  log: log  
}

module.exports = util;

function log(prefix) {

  return function() {
    if (process.env.SERVERLESS_STAGE === 'development')
      return;

    console.log('***************** ' + prefix + ' *******************');
    _.each(arguments, function(msg, i) { console.log(msg); });
    console.log('***************** /' + prefix + ' *******************');
    console.log('\n');
  };

}

function getTables() {
  return {
    biddings: 'slant-biddings-' + process.env.SERVERLESS_DATA_MODEL_STAGE,
    users: 'slant-users-' + process.env.SERVERLESS_DATA_MODEL_STAGE,
    caching: 'slant-caching-' + process.env.SERVERLESS_DATA_MODEL_STAGE,
    contributions: 'slant-contributions-' + process.env.SERVERLESS_DATA_MODEL_STAGE,
    evaluations: 'slant-evaluations-' + process.env.SERVERLESS_DATA_MODEL_STAGE
  };
}

function getDynamoDoc() {
  var dynamoConfig = {
    sessionToken:    process.env.AWS_SESSION_TOKEN,
    region:          process.env.AWS_REGION
  };
    
  return new AWS.DynamoDB.DocumentClient(dynamoConfig);
}

function sumRep(users) {
  return _.reduce(users, function(memo, user) {
    return memo + user.reputation;
  }, 0);
}

function getCachedSystemRep(cb) {

  var params = {
    TableName : util.tables.caching,
    Key: { type: "totalRepInSystem" }
  };

  return util.dynamoDoc.get(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data.Item.theValue);
  });
}