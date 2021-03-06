'use strict';

module.exports = {
  createBidding: createBidding,
  getBiddingWithLeadingContribution: getBiddingWithLeadingContribution,
  getBiddingContributions: getBiddingContributions,
  getBiddingUserEvaluations: getBiddingUserEvaluations,
  endBidding: endBidding,
  getContributions: getContributions,
  deleteBidding: deleteBidding,
  getWinningContribution: getWinningContribution
};

var _     = require('underscore');
var async = require('async');
var util = require('../../util');

function createBidding(event, cb) {

  var newBidding = {
    "id": util.uuid(),
    "status": 'InProgress',
    "createdAt": Date.now()
  };

  var params = {
    TableName : util.tables.biddings,
    Item: newBidding
  };

  util.dynamoDoc.put(params, function(err, data) {
    return cb(err, newBidding);
  });

}

function getBidding(event, cb) {

  var params = {
    TableName : util.tables.biddings,
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

function getBiddingWithLeadingContribution(event, cb) {
  async.parallel({
    bidding: function(parallelCB) {
      getBidding(event, parallelCB);
    },
    winningContribution: function(parallelCB) {
      getBiddingWinningContribution(event.id, parallelCB);
    }
  },
    function(err, results) {
      var bidding = results.bidding;
      bidding.winningContributionId = results.winningContribution.id;
      bidding.winningContributionScore = results.winningContribution.score;
      cb(err, bidding);
    }
  );
}

function getBiddingWinningContribution(biddingId, cb) {
  var evaluations;
  async.waterfall([
    function(callback) {
      getPositiveEvaluationsByBiddingId(biddingId, callback);
    },
    function(response, callback) {
      evaluations = response;
      getUsersByEvaluations(evaluations, callback);
    },
    function(response, callback) {
      var users = response;
      calcWinningContribution(users, evaluations, callback);
    }
  ],
    function(err, result) {
      cb(err, result);
    }
  );
}

function calcWinningContribution(users, evaluations, callback) {
  var scores = {};
  _.each(evaluations, function(evaluation) {
    if (!scores[evaluation.contributionId])
      scores[evaluation.contributionId] = 0;

    scores[evaluation.contributionId] += getUserRep(users, evaluation.userId);
  });
  var winningContribution = _.max(_.pairs(scores), _.last);
  winningContribution = {
    id: winningContribution[0],
    score: winningContribution[1]
  };
  callback(null, winningContribution);
}

function getUserRep(users, userId) {
  var user = _.find(users, function(u) {
    return u.id === userId;
  });
  return user.reputation;
}

function getPositiveEvaluationsByBiddingId(biddingId, callback) {
  var params = {
    TableName : util.tables.evaluations,
    IndexName: 'evaluations-biddingId-value',
    ExpressionAttributeNames: { '#v': 'value' }, // Need to do this since 'value' is a resevred dynamoDB word
    KeyConditionExpression: 'biddingId = :bkey and #v = :v',
    ExpressionAttributeValues: {
      ':bkey': biddingId,
      ':v': 1
    }
  };
  util.dynamoDoc.query(params, function(err, data) {
    return callback(err, data.Items);
  });
}

function getUsersByEvaluations(evaluations, callback) {
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
    return callback(err, data.Responses[util.tables.users]);
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
    TableName : util.tables.contributions,
    IndexName: 'contributions-biddingId-createdAt',
    KeyConditionExpression: 'biddingId = :hkey',
    ExpressionAttributeValues: { ':hkey': event.id }
  };

  util.dynamoDoc.query(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data.Items);
  });

}

function getBiddingUserEvaluations(event, cb) {
  async.waterfall([
    function(callback) {
      getUserEvaluations(event, callback);
    }
  ], function (err, result) {
    if (_.isEmpty(result)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(null, result.items);
  });
}

function getUserEvaluations(event, cb) {

  var params = {
    TableName : util.tables.evaluations,
    IndexName: 'evaluations-biddingId-userId',
    KeyConditionExpression: 'biddingId = :hkey and userId = :rkey',
    ExpressionAttributeValues: {
      ':hkey': event.id,
      ':rkey': event.userId
    }
  };
  util.dynamoDoc.query(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(null, {
      'err': err,
      'items': data.Items
    });
  });
}

function endBidding(event, cb) {
  var biddingId = event.id;
  var totalSystemRep;
  var winningContributionId;
  var winningContributionScore;
  var winningContributorId;

  async.waterfall([

    function(waterfallCB) {
      async.parallel({
        totalSystemRep: function(parallelCB) {
          getTotalRep(parallelCB);
        },
        winningContribution: function(parallelCB) {
          getBiddingWinningContribution(biddingId, parallelCB);
        }
      }, function(err, results) {
        totalSystemRep = results.totalSystemRep;
        winningContributionId = results.winningContribution.id
        winningContributionScore = results.winningContribution.score
        waterfallCB(err, null);
      });
    },

    function(emptyResult, waterfallCB) {
      getUserIdByContributionId(winningContributionId, waterfallCB);
    },

    function(winningContributorId) {
      async.parallel({
        endBiddingInDb: function(parallelCB) {
          endBiddingInDb(biddingId, winningContributionId, parallelCB);
        },
        rewardContributor: function(parallelCB) {
          rewardContributor(winningContributorId, winningContributionScore, totalSystemRep, parallelCB);
        }
      }, function(err, results) {
        var bidding = results.endBiddingInDb;
        bidding.winningContributorId = winningContributorId
        cb(err, bidding);
      });
    }
  ]);
}

function deleteBidding(event, cb) {

  var params = {
    TableName : util.tables.biddings,
    Key: { id: event.id },
    ReturnValues: 'ALL_OLD'
  };

  return util.dynamoDoc.delete(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data);
  });

}

function getWinningContribution(contributionId) {

  var params = {
    TableName : contributionTableName,
    Key: { id:contributionId }
  };

  util.dynamoDoc.get(params, function(err, data) {
    if (err) return {}; //err;
    else return data.Item;
  });

}

function endBiddingInDb(id, winningContributionId, cb) {
  var params = {
    TableName: util.tables.biddings,
    Key: { id: id },
    UpdateExpression: 'set #sta = :s, #win = :w, #end = :e',
    ExpressionAttributeNames: {
      '#sta' : 'status',
      '#win' : 'winningContributionId',
      '#end' : 'endedAt'
    },
    ExpressionAttributeValues: {
      ':s' : 'Completed',
      ':w' : winningContributionId,
      ':e' : Date.now()
    },
    ReturnValues: 'ALL_NEW'
  };

  return util.dynamoDoc.update(params, function(err, data) {
    return cb(err, data.Attributes);
  });
}

function rewardContributor(contributorId, contributionScore, totalSystemRep, cb) {
  var params = {
    TableName: util.tables.users,
    Key: { id: contributorId },
    UpdateExpression: 'set #tok = #tok + :t, #rep = #rep + :r',
    ExpressionAttributeNames: {'#tok' : 'tokens', '#rep' : 'reputation'},
    ExpressionAttributeValues: {
      ':t' : 10 * contributionScore / totalSystemRep,
      ':r' : 10 * contributionScore / totalSystemRep
    },
    ReturnValues: 'ALL_NEW'
  };
  return util.dynamoDoc.update(params, function(err, data) {
    return cb(err, data.Attributes);
  });
}

function getTotalRep(cb) {

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

function getUserIdByContributionId(winningContributionId, cb) {

  var params = {
    TableName : util.tables.contributions,
    Key: { id: winningContributionId }
  };

  return util.dynamoDoc.get(params, function(err, data) {
    if (_.isEmpty(data)) {
      err = '404:Resource not found.';
      return cb(err);
    }
    return cb(err, data.Item.userId);
  });

}