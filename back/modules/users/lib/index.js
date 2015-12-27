'use strict';

var  AWS     = require('aws-sdk'),
     uuid    = require('node-uuid');

var dynamoConfig = {
    sessionToken:    process.env.AWS_SESSION_TOKEN,
    region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'slant-users-' + process.env.SERVERLESS_DATA_MODEL_STAGE;


module.exports.create = function(event, cb) {

    var newUser = {
        "id": uuid.v4(),
        "tokens": 10,
        "reputation": 11,
        "createdAt": Date.now()
    };
    var params = {
        TableName : tableName,
        Item: newUser
    };
    function response() {
        return cb(null, newUser);
    }
    dynamodbDocClient.put(params, response);
};

module.exports.getUser = function(event, cb) {

    var params = {
        TableName : tableName,
        Key: {
            id: event.id
        }
    };

    return dynamodbDocClient.get(params, cb);
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

    var params = {
        TableName : tableName,
        Key: {
            id: event.id
        }
    };
    function response() {
        return cb(null, params.Key);
    }
    return dynamodbDocClient.delete(params, response);
};

module.exports.updateUser = function(event, cb) {

    var params = {
        TableName: tableName,
        Key: {
            id: event.id
        },
        UpdateExpression: 'set #tok = :t, #rep = :r',
        ExpressionAttributeNames: {'#tok' : 'tokens', '#rep' : 'reputation'},
        ExpressionAttributeValues: {
            ':t' : event.tokens,
            ':r' : event.reputation
        },
        ReturnValues: 'ALL_OLD'
    };

    //ConditionExpression: 'attribute_exists',
    return dynamodbDocClient.update(params, cb);
};
