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
        "biddingCount": 0,
        "createdAt": Date.now()
    };
    var params = {
        TableName : tableName,
        Item: newUser
    };
    dynamodbDocClient.put(params, function(err, data) {
        return cb(err, newUser);
    });
};

module.exports.getUser = function(event, cb) {

    var params = {
        TableName : tableName,
        Key: {
            id: event.id
        }
    };

    return dynamodbDocClient.get(params, function(err, data) {
        return cb(err, data.Item);
    });
};


module.exports.getUserEvaluations = function(event, cb) {

    var response = [];

    return cb(null, response);
};

module.exports.getUserContributions = function(event, cb) {

    var response = [];

    return cb(null, response);
};

module.exports.deleteUser = function(event, cb) {

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
        ReturnValues: 'ALL_NEW'
    };

    //ConditionExpression: 'attribute_exists',
    return dynamodbDocClient.update(params, function(err, data) {
        return cb(err, data.Attributes);
    });

    //var updatedUser = {};
    //updatedUser.id = event.id;
    //if (event.tokens) updatedUser.tokens = event.tokens;
    //if (event.reputation) updatedUser.reputations = event.reputation;
    //var params = {
    //    TableName : tableName,
    //    Key: {
    //        id: event.id
    //    },
    //    Item: updatedUser
    //};
    //dynamodbDocClient.put(params, function(err, data) {
    //    return cb(err, data);
    //});
};
