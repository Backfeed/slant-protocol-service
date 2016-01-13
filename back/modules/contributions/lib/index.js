'use strict';

module.exports = {
  createContribution: createContribution,
  getContribution: getContribution,
  getContributionEvaluations: getContributionEvaluations,
  getContributionUsers: getContributionUsers,
  deleteContribution: deleteContribution
};

var _     = require('underscore');
var util  = require('../../util');
var db    = require('../../util/db');

function createContribution(event, cb) {

  var newContribution = {
    "id": util.uuid(),
    "userId": event.userId,
    "biddingId": event.biddingId,
    "createdAt": Date.now()
  };

  var params = {
    TableName : db.tables.contributions,
    Item: newContribution
  };

  return db.put(params, cb, newContribution);
}

function getContribution(event, cb) {

  var params = {
    TableName : db.tables.contributions,
    Key: { id: event.id }
  };

  return db.get(params, cb);
}

function getContributionEvaluations(event, cb) {

  var params = {
    TableName : db.tables.evaluations,
    IndexName: 'evaluations-contributionId-createdAt',
    KeyConditionExpression: 'contributionId = :hkey',
    ExpressionAttributeValues: { ':hkey': event.id }
  };

  db.query(params, cb);
}

function getContributionUsers(event, cb) {
  var response = [];
  return cb(null, response);
}

function deleteContribution(event, cb) {

  var params = {
    TableName : db.tables.contributions,
    Key: { id: event.id },
    ReturnValues: 'ALL_OLD'
  };

  return db.del(params, cb);
}
