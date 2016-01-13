'use strict';

var _        = require('underscore');
var AWS      = require('aws-sdk');
var util     = require('./');

var db = {
  putItem:       putItem,
  getItem:       getItem,
  query:         query,
  scan:          scan,
  updateItem:    updateItem,
  deleteItem:    deleteItem,
  batchGet:      batchGet,
  batchWrite:    batchWrite,
  tables:        getTables(),
  dynamoDoc:     getDynamoDoc()
};

module.exports = db;

function getDynamoDoc() {
  var dynamoConfig = {
    sessionToken:    process.env.AWS_SESSION_TOKEN,
    region:          process.env.AWS_REGION
  };
  return new AWS.DynamoDB.DocumentClient(dynamoConfig);
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

function returnIfNotFound(data, cb) {
  if (_.isEmpty(data)) {
    return cb('404:Resource not found.');
  }
}

function putItem(params, cb, respondSuffix) {
  return db.dynamoDoc.put(params, function(err, data) {
    if (respondSuffix && _.isEmpty(data)) data = respondSuffix;
    util.log.info(err, data);
    return cb(err, data);
  });
}

function getItem(params, cb) {
  return db.dynamoDoc.get(params, function(err, data) {
    util.log.info(err, data);
    if (err) return {}; //err;
    returnIfNotFound(data, cb);
    return cb(err, data.Item);
  });
}

function query(params, cb) {
  db.dynamoDoc.query(params, function(err, data) {
    returnIfNotFound(data.Items, cb);
    return cb(err, data.Items);
  });
}

function scan(params, cb) {

}

function updateItem(params, cb) {
  return db.dynamoDoc.update(params, function(err, data) {
    util.log.info(err, data);
    returnIfNotFound(data, cb);
    return cb(err, data.Attributes);
  });
}

function deleteItem(params, cb) {
  return db.dynamoDoc.delete(params, function(err, data) {
    util.log.info(err, data);
    returnIfNotFound(data, cb);
    return cb(err, data.Attributes);
  });
}

function batchGet(params, cb, table) {
  db.dynamoDoc.batchGet(params, function(err, data) {
    return cb(err, data.Responses[table]);
  });
}

function batchWrite(params, cb, responseValue) {
  db.dynamoDoc.batchWrite(params, function(err, data) {
    return cb(err, responseValue);
  });
}
