var uuid = require('node-uuid');

module.exports.create = function(event, cb) {

    var response = {
        "id": uuid.v4(),
        "tokens": 10,
        "reputation": 11,
        "createdAt": Date.now()
    };

    return cb(null, response);
};

module.exports.getUser = function(event, cb) {

    console.log("event", event);
    var response = {
        "id": event.id,
        "tokens": 10,
        "reputation": 11,
        "createdAt": Date.now(),
        "event": event
    };

    return cb(null, response);
};


module.exports.getUserEvaluations = function(event, cb) {

    console.log("event", event);
    var response = {
        "id": event.id,
        "tokens": 10,
        "reputation": 11,
        "createdAt": Date.now(),
        "event": event
    };

    return cb(null, response);
};
module.exports.getUserContributions = function(event, cb) {

    console.log("event", event);
    var response = {
        "id": event.id,
        "tokens": 10,
        "reputation": 11,
        "createdAt": Date.now(),
        "event": event
    };

    return cb(null, response);
};
module.exports.deleteUser = function(event, cb) {

    var response = {
        "id": event.id
    };

    return cb(null, response);
};

module.exports.updateUser = function(event, cb) {

    var response = {
        "event": event
    };

    return cb(null, response);
};
