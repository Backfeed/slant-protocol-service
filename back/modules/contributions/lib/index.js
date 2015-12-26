var uuid = require('node-uuid');

module.exports.createContribution = function(event, cb) {

  var response = {
    "id": uuid.v4(),
    "createdAt": Date.now()
  };

  return cb(null, response);
};

module.exports.getContribution = function(event, cb) {

  var response = {
    "id": event.id,
    "createdAt": Date.now(),
    "event": event
  };

  return cb(null, response);
};

module.exports.getContributionEvaluations = function(event, cb) {

  var response = [];

  return cb(null, response);
};

module.exports.getContributionUsers = function(event, cb) {

  var response = [];

  return cb(null, response);
};

module.exports.deleteContribution = function(event, cb) {

  var response = {
    "id": event.id
  };

  return cb(null, response);
};
