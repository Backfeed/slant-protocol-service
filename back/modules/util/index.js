'use strict';

var logger = require('./logger');
var _      = require('underscore');
var uuid   = require('node-uuid');
var math   = require('mathjs');

var util = {
  tables: getTables(),
  uuid: uuid.v4,
  sumRep: sumRep,
  math: math,
  roundTo: getRoundTo(),
  pp: parseProtocol,
  log: logger.winston
};

module.exports = util;

function getTables() {
  return {
    biddings: 'slant-biddings-' + process.env.SERVERLESS_DATA_MODEL_STAGE,
    users: 'slant-users-' + process.env.SERVERLESS_DATA_MODEL_STAGE,
    caching: 'slant-caching-' + process.env.SERVERLESS_DATA_MODEL_STAGE,
    contributions: 'slant-contributions-' + process.env.SERVERLESS_DATA_MODEL_STAGE,
    evaluations: 'slant-evaluations-' + process.env.SERVERLESS_DATA_MODEL_STAGE
  };
}

function sumRep(users) {
  return _.reduce(users, function(memo, user) {
    return math.add(memo, user.reputation);
  }, 0);
}

function getRoundTo() {
  return math.eval(process.env.ROUND_TO);
}

function parseProtocol(n) {
  return math.round(n, math.eval(process.env.ROUND_TO));
}