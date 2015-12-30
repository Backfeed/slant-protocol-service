'use strict';

/**
 * Serverless Module: Lambda Handler
 * - Your lambda functions should be a thin wrapper around your own separate
 * modules, to keep your code testable, reusable and AWS independent
 * - 'serverless-helpers-js' module is required for Serverless ENV var support.  Hopefully, AWS will add ENV support to Lambda soon :)
 */

// Require Serverless ENV vars
var ServerlessHelpers = require('serverless-helpers-js').loadEnv();

// Require Logic
var lib = require('../lib');

var log = lib.log('CACHE TOTAL USERS REP');

// Lambda Handler
module.exports.handler = function(event, context) {
  lib.cacheTotalUsersRep(event, function(error, response) {
    return context.done(error, response);
  });
};