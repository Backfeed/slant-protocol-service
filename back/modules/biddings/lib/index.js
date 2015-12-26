var uuid = require('node-uuid');

module.exports.createBidding = function(event, cb) {

  var response = {
    "id": uuid.v4(),
    "createdAt": Date.now()
  };

  return cb(null, response);
};

module.exports.getBidding = function(event, cb) {

  var response = {
    "id": event.id,
    "active": true,
    "createdAt": Date.now(),
    "event": event
  };

  return cb(null, response);
};

module.exports.getBiddingContributions = function(event, cb) {

  var response = [];

  return cb(null, response);
};

module.exports.getBiddingUsers = function(event, cb) {

  var response = [];

  return cb(null, response);
};

module.exports.endBidding = function(event, cb) {

  var response = {
    "id": event.id,
    "contributionId": event.id,
    "active": true,
    "createdAt": Date.now(),
    "endedAt": Date.now(),
    "event": event
  };

  return cb(null, response);
};

module.exports.deleteBidding = function(event, cb) {

  var response = {
    "id": event.id
  };

  return cb(null, response);
};
