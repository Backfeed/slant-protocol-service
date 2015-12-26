var uuid = require('node-uuid');

module.exports.createEvaluation = function(event, cb) {

  var response = {
    "id": uuid.v4(),
    "createdAt": Date.now()
  };

  return cb(null, response);
};

module.exports.getEvaluation = function(event, cb) {

  var response = {
    "id": event.id,
    "createdAt": Date.now(),
    "event": event
  };

  return cb(null, response);
};

module.exports.deleteEvaluation = function(event, cb) {

  var response = {
    "id": event.id
  };

  return cb(null, response);
};
