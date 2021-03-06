module.exports = {

  user: {
    create: createUser,
    createN: createUsers,
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
  },

  cleanseDB: cleanseDB,

  toBody: toBody,
  pp: parseRep

};

var _ = require('underscore');
var chakram = require('chakram');

var URL = 'https://api.backfeed.cc/1.1';

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

function createEvaluations(body) { return chakram.post(URL + '/evaluations/submit', body, params) };
function getEvaluation(id) { return chakram.get(URL + '/evaluations/' + id , params) };
function deleteEvaluation(id) { return chakram.delete(URL + '/evaluations/' + id, {}, params) };

function createUsers(n) {
  var responses = [];
  _.times(5, function(n) {
    responses.push(createUser());
  });

  return chakram.all(responses).then(toBodies);
}

function cleanseDB() {
  return chakram.delete(URL + '/util/cleansedb', {}, params);
}

function toBodies(xs) {
  return _.map(xs, toBody);
}

function toBody(x) {
  return x.body;
}

function parseRep(n) {
  return parseFloat(n.toFixed(10));
}
