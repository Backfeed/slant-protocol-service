'use strict';

module.exports = {
  createEvaluation: createEvaluation,
  getEvaluation: getEvaluation,
  deleteEvaluation: deleteEvaluation
};

var _     = require('underscore');
var async = require('async');
var util = require('../../util');
var createSingleEvaluation = require('../lib/createSingleEvaluation');

function createEvaluation(event, cb) {

  var params = {
    TableName : util.tables.evaluations,
    RequestItems: {},
    ReturnConsumedCapacity: 'NONE',
    ReturnItemCollectionMetrics: 'NONE'
  };

  var submittedEvaluations = [];
  var submittedEvaluationsIds = [];
  var newEvaluation;
  async.each(event.evaluations, function(element, callback) {
    newEvaluation = {
      "id": element.id || util.uuid(),
      "userId": event.userId,
      "biddingId": event.biddingId,
      "contributionId": element.contributionId,
      "value": element.value,
      "createdAt": Date.now()
    };

    var dbEvaluationWrapper = {
      PutRequest: {
        Item: newEvaluation
      }
    };

    submittedEvaluations.push(dbEvaluationWrapper);
    submittedEvaluationsIds.push(newEvaluation.id);
    createSingleEvaluation.execute(newEvaluation, callback);

  }, function(err) {
    console.log('iterate done');
    params.RequestItems[util.tables.evaluations] = submittedEvaluations;
    util.dynamoDoc.batchWrite(params, function(err, data) {
      return cb(err, submittedEvaluationsIds);
    });
  });

}

function getEvaluation(event, cb) {

  var params = {
    TableName : util.tables.evaluations,
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

function deleteEvaluation(event, cb) {

  var params = {
    TableName : util.tables.evaluations,
    Key: { id: event.id }
  };
  
  return util.dynamoDoc.delete(params, function(err, data) {
    return cb(err, params.Key);
  });
  
}