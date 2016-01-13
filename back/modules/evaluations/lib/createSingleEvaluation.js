'use strict';

var ServerlessHelpers = require('serverless-helpers-js').loadEnv();
var _    = require('underscore');
var async = require('async');
var util = require('../../util');
var Immutable = require('immutable');
var protocol = require('backfeed-slant-protocol');
var log = util.log('CREATE SINGLE');

var stake = 0.05;
var alpha = 0.5;
var beta = 0.7;

// Lambda Handler
module.exports.execute = function(event, cb) {

  log('event', event);

  var iMap = Immutable.Map({ 
    newRep: 0,
    voteRep: 0,
    contributionRep: 0,
    systemRep: 0
  });

  var startTime = new Date().getTime();

  var evaluations;
  var evaluators;

  async.waterfall([

    function(waterfallCB) {
      async.parallel({
        systemRep: function(parallelCB) {
          util.getCachedRep(parallelCB);
        },
        evaluations: function(parallelCB) {
          getEvaluations(event.contributionId, parallelCB);
        }
      },
        function(err, results) {
          waterfallCB(err, results);
        }
      );
    },

    function(results, waterfallCB) {
      iMap = iMap.set('systemRep', results.systemRep.theValue);
      log('systemRep', iMap.get('systemRep'));
      evaluations = results.evaluations;

      var currentUserFormerEvaluation = _.findWhere(evaluations, { userId: event.userId });

      if (!!currentUserFormerEvaluation) {

        if (currentUserFormerEvaluation.value === event.value) {
          return cb(new Error('400: bad request. current user already evaluated this contribution with this value'));
        }

        log('current user already evaluated this contribution, removing his vote');
        evaluations = _.reject(evaluations, function(e) {
          return e.userId === event.userId;
        });

      }

      evaluations.push(event);
      log('evaluations', evaluations);
      getEvaluators(evaluations, waterfallCB);

    },

    function(result, waterfallCB) {
      evaluators = result;

      var data = {
        uid: event.userId,
        value: event.value,
        evaluators: evaluators,
        evaluations: evaluations,
        systemRep: iMap.get('systemRep')
      };

      evaluators = protocol.evaluate(data);

      updateEvaluatorsRepToDb(evaluators, cb);
    }

  ]);

}



function updateEvaluatorsRepToDb(evaluators, callback) {
  var params = {
    TableName: util.tables.users,
    RequestItems: {},
    ReturnConsumedCapacity: 'NONE',
    ReturnItemCollectionMetrics: 'NONE'
  };
  var submittedEvaluators = [];
  _.each(evaluators, function(evaluator) {
    var dbEvaluatorsWrapper = {
      PutRequest: { Item: evaluator }
    };
    submittedEvaluators.push(dbEvaluatorsWrapper);
  });

  params.RequestItems[util.tables.users] = submittedEvaluators;
  util.dynamoDoc.batchWrite(params, function(err, data) {
    callback(err, data);
  });
}

function getEvaluations(contributionId, cb) {
  var paramsForQueringEvaluations = {
    TableName : util.tables.evaluations,
    IndexName: 'evaluations-contributionId-createdAt',
    KeyConditionExpression: 'contributionId = :hkey',
    ExpressionAttributeValues: { ':hkey': contributionId }
  };
  util.dynamoDoc.query(paramsForQueringEvaluations, function(err, data) {
    return cb(err, data.Items);
  });
}

function getEvaluators(evaluations, cb) {

  var params = {
    RequestItems: {}
  };

  var Keys = _.map(evaluations, function(evaluation) {
    return { id: evaluation.userId };
  });

  Keys = _.uniq(Keys, function(item, key, a) { 
    return item.id;
  });

  params.RequestItems[util.tables.users] = {
    Keys: Keys
  };

  util.dynamoDoc.batchGet(params, function(err, data) {
    return cb(err, data.Responses[util.tables.users]);
  });
}