'use strict';

module.exports = {
  cleanseDb: cleanseDb,
  syncCachedSystemRep: syncCachedSystemRep,
  cacheTotalUsersRep: cacheTotalUsersRep,
  cacheTotalRep: cacheTotalRep
}

var _    = require('underscore');
var async = require('async');
var util = require('../');

function cacheTotalRep(event, cb) {

  var params = {
    TableName: util.tables.caching,
    Key: { type: "totalRepInSystem" },
    UpdateExpression: 'set #val = :v',
    ExpressionAttributeNames: { '#val' : 'theValue' },
    ExpressionAttributeValues: { ':v' : event.reputation },
    ReturnValues: 'ALL_NEW'
  };

  return util.dynamoDoc.update(params, function(err, data) {
    return cb(err, data.Attributes.theValue);
  });

}

function cacheTotalUsersRep(event, cb) {

  var paramsForQueringUsers = {
    TableName: util.tables.users,
    ProjectionExpression:"reputation",
    ConsistentRead: true,
    ReturnConsumedCapacity: "TOTAL"
  };
  
  util.dynamoDoc.scan(paramsForQueringUsers, function(err, data) {
    if (err) return cb(err);
    var totalRep = util.sumRep(data.Items);
    cacheTotalRep({ reputation: totalRep }, cb);
  });
  
}

function syncCachedSystemRep(event, cb) {
  return cb(event);
}

function cleanseDb(event, cb) {
  async.parallel([

    function(parallelCB) {
      async.waterfall([
        function(waterfallCB) {
          getAllItemsFromDb('users', waterfallCB);
        },
        function(users, waterfallCB) {
          deleteItemsFromDb(users, 'users', parallelCB);
        }
      ]);
    },

    function(parallelCB) {
      async.waterfall([
        function(waterfallCB) {
          getAllItemsFromDb('biddings', waterfallCB);
        },
        function(biddings, waterfallCB) {
          deleteItemsFromDb(biddings, 'biddings', parallelCB);
        }
      ]);
    },

    function(parallelCB) {
      async.waterfall([
        function(waterfallCB) {
          getAllItemsFromDb('contributions', waterfallCB);
        },
        function(contributions, waterfallCB) {
          deleteItemsFromDb(contributions, 'contributions', parallelCB);
        }
      ]);
    },

    function(parallelCB) {
      async.waterfall([
        function(waterfallCB) {
          getAllItemsFromDb('evaluations', waterfallCB);
        },
        function(evaluations, waterfallCB) {
          deleteItemsFromDb(evaluations, 'evaluations', parallelCB);
        }
      ]);
    }

  ], function(err, results) {
    cb(err, results);
  });
}

function getAllItemsFromDb(table, cb) {
  var paramsForQueringUsers = {
    TableName: util.tables[table],
    ConsistentRead: true,
    ReturnConsumedCapacity: "TOTAL"
  };
  
  util.dynamoDoc.scan(paramsForQueringUsers, function(err, data) {
    console.log('err', err, 'data', data);
    if (err) return cb(err);
    cb(err, data.Items);
  });
}

function deleteItemsFromDb(xs, table, cb) {

  async.each(xs, function(x, asyncCB) {
    var params = {
      TableName : util.tables[table],
      Key: { id: x.id }
    };

    return util.dynamoDoc.delete(params, function(err, data) {
      return asyncCB(err, params.key);
    });

  }, function(err) {
    cb(err, xs.length + ' ' + table + ' deleted');
  });

}