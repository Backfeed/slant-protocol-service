'use strict';

module.exports = {
  createUser: createUser,
  getUser: getUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  getUserEvaluations: getUserEvaluations,
  getUserContributions: getUserContributions
};

var _     = require('underscore');
var async = require('async');
var util  = require('../../util');

function createUser(event, cb) {
  var newUser = {
    "id": util.uuid(),
    "tokens": event.tokens || parseFloat(process.env.USER_INITIAL_TOKENS),
    "reputation": event.reputation || parseFloat(process.env.USER_INITIAL_REPUTATION),
    "biddingCount": 0,
    "createdAt": Date.now()
  };

  var params = {
    TableName : util.tables.users,
    Item: newUser
  };

  util.dynamoDoc.put(params, function(err, data) {
    return cb(err, newUser);
  });

}

function getUser(event, cb) {

  var params = {
    TableName : util.tables.users,
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

function getUserEvaluations(event, cb) {
  var params = {
    TableName : util.tables.evaluations,
    IndexName: 'evaluations-userId-createdAt',
    KeyConditionExpression: 'userId = :hkey',
    ExpressionAttributeValues: { ':hkey': event.id }
  };

  util.dynamoDoc.query(params, function(err, data) {
    if (_.isEmpty(data.Items)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data.Items);
  });
}

function getUserContributions(event, cb) {

  var params = {
    TableName : util.tables.contributions,
    IndexName: 'contributions-by-userId-index',
    KeyConditionExpression: 'userId = :hkey',
    ExpressionAttributeValues: {
      ':hkey': event.id
    }
  };
  util.dynamoDoc.query(params, function(err, data) {
    if (_.isEmpty(data.Items)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data.Items);
  });
}

function deleteUser(event, cb) {
  var params = {
    TableName : util.tables.users,
    Key: { id: event.id }
  };
  return util.dynamoDoc.delete(params, function(err, data) {
    return cb(err, params.Key);
  });
}

function updateUser(event, cb) {

  var params = {
    TableName: util.tables.users,
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

  return util.dynamoDoc.update(params, function(err, data) {
    return cb(err, data.Attributes);
  });
}