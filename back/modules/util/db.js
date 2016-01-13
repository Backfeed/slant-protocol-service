'use strict';

var _         = require('underscore');
var AWS       = require('aws-sdk');
var util      = require('./');
var dynamoDoc = getDynamoDoc();
var notFoundMsg = '404:Resource not found.';

var db = {
  put: put,
  get: get,
  query: query,
  scan: scan,
  update: update,
  del: del,
  batchGet: batchGet,
  batchWrite: batchWrite,
  tables: getTables()
};

module.exports = db;

function put(params, cb, respondSuffix) {
  return dynamoDoc.put(params, function(err, data) {
    if (respondSuffix && _.isEmpty(data)) data = respondSuffix;
    util.log.info(err, data);
    return cb(err, data);
  });
}

function get(params, cb) {
  return dynamoDoc.get(params, function(err, data) {
    util.log.info(err, data);
    if (err) return {}; //err;
    if (_.isEmpty(data)) return cb(notFoundMsg);
    return cb(err, data.Item);
  });
}

function query(params, cb) {
  return dynamoDoc.query(params, function(err, data) {
    if (_.isEmpty(data)) return cb(notFoundMsg);
    return cb(err, data.Items);
  });
}

function scan(params, cb) {
  return util.dynamoDoc.scan(params, function(err, data) {
    if (_.isEmpty(data)) return cb(notFoundMsg);
    return cb(err, data.Items);
  });
}

function update(params, cb) {
  return dynamoDoc.update(params, function(err, data) {
    util.log.info(err, data);
    if (_.isEmpty(data)) return cb(notFoundMsg);
    return cb(err, data.Attributes);
  });
}

function del(params, cb) {
  return dynamoDoc.delete(params, function(err, data) {
    util.log.info(err, data);
    if (_.isEmpty(data)) return cb(notFoundMsg);
    return cb(err, data.Attributes);
  });
}

function batchGet(params, cb, table) {
  return dynamoDoc.batchGet(params, function(err, data) {
    return cb(err, data.Responses[table]);
  });
}

function batchWrite(params, cb, responseValue) {
  return dynamoDoc.batchWrite(params, function(err, data) {
    return cb(err, responseValue);
  });
}

function getDynamoDoc() {
  var dynamoConfig = {
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region:       process.env.AWS_REGION
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

function returnNotFound(data, cb) {
  return cb('404:Resource not found.');
}