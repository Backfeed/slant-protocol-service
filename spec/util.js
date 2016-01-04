module.exports = {

  user: {
    create: createUser,
    get: getUser,
    delete: deleteUser
  },

  bidding: {
    create: createBidding,
    get: getBidding,
    delete: deleteBidding
  },

  contribution: {
    create: createContribution,
    get: getContribution,
    delete: deleteContribution
  },

  evaluation: {
    create: createEvaluations,
    get: getEvaluation,
    delete: deleteEvaluation
  }

};

var _ = require('underscore');
var chakram = require('chakram');

var URL = 'https://api.backfeed.cc/slantdev';

var params =  {
  headers: { 'x-api-key': process.env.X_API_KEY }
};

function createUser() { return chakram.post(URL + '/users/', {}, params) };
function getUser(id) { return chakram.get(URL + '/users/' + id, params) };
function deleteUser(id) { return chakram.delete(URL + '/users/' + id, {}, params) };

function createBidding() { return chakram.post(URL + '/biddings/', {}, params) };
function getBidding(id) { return chakram.get(URL + '/biddings/' + id, params) };
function deleteBidding(id) { return chakram.delete(URL + '/biddings/' + id, {}, params) };

function createContribution(body) { return chakram.post(URL + '/contributions/', body, params) };
function getContribution(id) { return chakram.get(URL + '/contributions/' + id, params) };
function deleteContribution(id) { return chakram.delete(URL + '/contributions/' + id, {}, params) };

function createEvaluations(body) { return chakram.post(URL + '/evaluations/', body, params) };
function getEvaluation(id) { return chakram.get(URL + '/evaluations/' + id , params) };
function deleteEvaluation(id) { return chakram.delete(URL + '/evaluations/' + id, {}, params) };