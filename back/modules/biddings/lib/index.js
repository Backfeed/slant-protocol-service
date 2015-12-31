'use strict';

var _     = require('underscore');
var AWS   = require('aws-sdk');
var uuid  = require('node-uuid');
var async = require('async');

var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-biddings-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var contributionsTableName = 'slant-contributions-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var evaluationsTableName = 'slant-evaluations-' + process.env.SERVERLESS_DATA_MODEL_STAGE;
var usersTableName = 'slant-users-' + process.env.SERVERLESS_DATA_MODEL_STAGE;

var hLog = log('HELPERS');

module.exports = {
  createBidding: createBidding,
  getBidding: getBidding,
  getBiddingContributions: getBiddingContributions,
  getBiddingUsers: getBiddingUsers,
  getBiddingUserEvaluations: getBiddingUserEvaluations,
  endBidding: endBidding,
  getContributions: getContributions,
  deleteBidding: deleteBidding,
  getWinningContribution: getWinningContribution,
  log: log
};

function createBidding(event, cb) {

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
}

function getBidding(event, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: event.id
    }
  };

  return dynamodbDocClient.get(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data.Item);
  });
}

function getBiddingContributions(event, cb) {

  var contributions;
  var evaluations;
  async.waterfall([
    function(callback) {
      getContributions(event, callback);
    },
    function(result, callback) {
      contributions = result;
      getUserEvaluations(event, callback);
    },
    function(result, callback) {
      evaluations = result.items;
      if (contributions && event.userId)
      {
        _.each(contributions, function(element) {
          var myEval = _.find(evaluations, function(item) { return item.contributionId === element.id});
          if (myEval) {
            element.userContext = {};
            element.userContext.evaluation = {};
            element.userContext.evaluation.id = myEval.id;
            element.userContext.evaluation.value = myEval.value;
          }
        });
      }
      callback(null, contributions);
    }
  ], function (err, result) {
    return cb(null, result);
  });
}

function getContributions(event, cb) {

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
}
function getBiddingUsers(event, cb) {

  var response = [];

  return cb(null, response);
}


function getBiddingUserEvaluations(event, cb) {
  async.waterfall([
    function(callback) {
      getUserEvaluations(event, callback);
    }
  ], function (err, result) {
    return cb(null, result.items);
  });
}

function getUserEvaluations(event, cb) {

  var params = {
    TableName : evaluationsTableName,
    IndexName: 'evaluations-biddingId-userId-index',
    KeyConditionExpression: 'biddingId = :hkey and userId = :rkey',
    ExpressionAttributeValues: {
      ':hkey': event.id,
      ':rkey': event.userId
    }
  };
  dynamodbDocClient.query(params, function(err, data) {
    return cb(null, {
      'err': err,
      'items': data.Items
    });
  });
}

function endBidding(event, cb) {

  // Protocol calculates the winning contribution
  getContributions(event, function(err, contributions) {
    if (err) {
      console.log('endBidding', err);
      return cb(err);
    }

    console.log('contributions', contributions);

    var winningContribution = _.max(contributions, function(contribution) {
      return contribution.score;
    });

    console.log('winningContribution', winningContribution);

    // the callback updates the DB
    var params = {
      TableName: tableName,
      Key: { id: event.id },
      UpdateExpression: 'set #sta = :s, #win = :w, #end = :e',
      ExpressionAttributeNames: {
        '#sta' : 'status',
        '#win' : 'winningContribution',
        '#end' : 'endedAt'
      },
      ExpressionAttributeValues: {
        ':s' : 'Completed',
        ':w' : winningContribution.id,
        ':e' : Date.now()
      },
      ReturnValues: 'ALL_NEW'
    };

    return dynamodbDocClient.update(params, function(err, data) {
      console.log('DB update CB: data', data);
      return cb(err, data.Attributes);
    });

  });

};

function deleteBidding(event, cb) {

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

function log(prefix) {

  return function() {
    if (process.env.SERVERLESS_STAGE === 'development')
      return;
    
    console.log('***************** ' + 'BIDDINGS: ' + prefix + ' *******************');
    _.each(arguments, function(msg, i) { console.log(msg); });
    console.log('***************** /' + 'BIDDINGS: ' + prefix + ' *******************');
    // console.log('\n');
  };

}
