'use strict';

module.exports = {
  syncCachedSystemRep: syncCachedSystemRep,
  cacheTotalUsersRep: cacheTotalUsersRep,
  cacheTotalRep: cacheTotalRep
}

var _    = require('underscore');
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