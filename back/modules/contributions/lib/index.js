'use strict';

module.exports = {
  createContribution: createContribution,
  getContribution: getContribution,
  getContributionEvaluations: getContributionEvaluations,
  getContributionUsers: getContributionUsers,
  deleteContribution: deleteContribution
};

var _ = require('underscore');
var util = require('../../util');

function createContribution(event, cb) {

  var newContribution = {
    "id": util.uuid(),
    "userId": event.userId,
    "biddingId": event.biddingId,
    "createdAt": Date.now()
  };

  var params = {
    TableName : util.tables.contributions,
    Item: newContribution
  };

  util.dynamoDoc.put(params, function(err, data) {
    return cb(err, newContribution);
  });

}

function getContribution(event, cb) {

  var params = {
    TableName : util.tables.contributions,
    Key: { id: event.id }
  };

  return util.dynamoDoc.get(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data.Item);
  });

}

function getContributionEvaluations(event, cb) {

  var params = {
    TableName : util.tables.evaluations,
    IndexName: 'evaluations-contributionId-createdAt',
    KeyConditionExpression: 'contributionId = :hkey',
    ExpressionAttributeValues: { ':hkey': event.id }
  };

  util.dynamoDoc.query(params, function(err, data) {
    return cb(err, data.Items);
  });

}

function getContributionUsers(event, cb) {
  var response = [];
  return cb(null, response);
}

function deleteContribution(event, cb) {

  var params = {
    TableName : util.tables.contributions,
    Key: { id: event.id }
  };

  return util.dynamoDoc.delete(params, function(err, data) {
    return cb(err, params.Key);
  });

}