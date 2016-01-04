var ServerlessHelpers = require('serverless-helpers-js').loadEnv();
var _ = require('underscore');
var chakram = require('chakram');
expect = chakram.expect;
//var expect = require('chai').expect;
//var assert = require('chai').assert;

var util = require('../util');

describe("Slant Protocol API", function() {


  before("Initialize things for the tests", function () {
  });

  xit("should return 201 on success", function () {
    return expect(util.user.create()).to.have.status(201);
  });

  xit("should return 200 when finding a user", function () {
    return expect(util.user.create(userId)).to.have.status(200);
  });

  it("should return 404 when not finding a user", function () {
    var nonUserGET = util.user.get('1');
    return expect(nonUserGET).to.have.status(404);
  });

  describe("play with some users data", function () {

        // Users
        var george, paul, john, ringo, pete;
        // Biddings
        var abbey, white, revolver, pepper;
        // Contributions
        var something, blackbird, taxman, lucy;

        before("Initialize things for the tests", function () {
        });

        //it("should return beatles reputation", function () {
        //    createUser().then(function(respObj) {
        //        console.log(respObj.body);
        //        ringo = respObj.body;
        //        expect(ringo.reputation).to.equal(1);
        //    });
        //    //console.log(george,paul,john,ringo);
        //    return chakram.wait();
        //});

it("should create the beatles - Users", function () {
  this.timeout(10000);
  var multipleResponses = [];

  _.times(5, function(n) { multipleResponses.push(util.user.create()) });

  return chakram.all(multipleResponses).then(function(responses) {
    var users = responses.map(function(response) {
      return response.body;
    });

    george = users[0]; paul = users[1]; john = users[2]; ringo = users[3]; pete = users[4];

    expect(george.createdAt).to.be.a('number');
    expect(paul.tokens).to.equal(10);
    expect(john.id).to.have.length.above(2);
    expect(ringo.reputation).to.equal(11);
                //console.log(paul);
              });
});

it("should create albums - Biddings", function () {
  this.timeout(10000);
  var multipleResponses = [];
  _.times(4, function(n) { multipleResponses.push(util.bidding.create()) });
  return chakram.all(multipleResponses).then(function(responses) {
    var biddings = responses.map(function(response) {
                    //console.log(response.body);
                    return response.body;
                  });
    abbey = biddings[0]; white = biddings[1]; revolver = biddings[2]; pepper = biddings[3];
    expect(abbey.createdAt).to.be.a('number');
    expect(white.status).to.equal('InProgress');
    expect(revolver.id).to.have.length.above(2);
  });
});

it("should create song titles - Contributions", function () {
  this.timeout(10000);
  var multipleResponses = [];
  multipleResponses.push(util.contribution.create({ 'userId': george.id, 'biddingId': abbey.id }));
  multipleResponses.push(util.contribution.create({ 'userId': paul.id, 'biddingId': white.id }));
  multipleResponses.push(util.contribution.create({ 'userId': john.id, 'biddingId': revolver.id }));
  multipleResponses.push(util.contribution.create({ 'userId': ringo.id, 'biddingId': pepper.id }));
  return chakram.all(multipleResponses).then(function(responses) {
    var contributions = responses.map(function(response) {
                    //console.log(response.body);
                    return response.body;
                  });
    something = contributions[0]; blackbird = contributions[1]; taxman = contributions[2]; lucy = contributions[3];
    expect(something.createdAt).to.be.a('number');
    expect(blackbird.userId).to.equal(paul.id);
    expect(taxman.biddingId).to.equal(revolver.id);
    expect(lucy.id).to.have.length.above(2);
  });
});

it("should create evaluations for blackbird - Evaluations", function () {
  this.timeout(10000);
  var multipleResponses = [];

  multipleResponses.push(util.evaluation.create({ 'userId': george.id, 'biddingId': abbey.id, evaluations: [{ 'contributionId': something.id, 'value': 1}] }));

  return chakram.all(multipleResponses).then(function(responses) {
    var evaluations = responses.map(function(response) {
                    //console.log(response.body);
                    return response.body;
                  });
    expect(evaluations[0]).to.be.a('object');
                //expect(_.isEmpty(evaluations[0])).to.be.true;
              });
});

it("should create evaluations for taxman - Evaluations", function () {

});

it("should clean things up", function () {
  util.user.delete(george.id).then(function(res) {
                //console.log(res.body);
                expect(res.body.id).to.be.equal(george.id);
                return chakram.wait();
              });
  util.user.delete(paul.id).then(function(res) {
                //console.log(res.body);
                expect(res.body.id).to.be.equal(paul.id);
                return chakram.wait();
              });
  util.user.delete(john.id);
  util.user.delete(ringo.id);
  util.user.delete(pete.id);
  util.bidding.delete(abbey.id);
  util.bidding.delete(white.id);
  util.bidding.delete(revolver.id);
  util.bidding.delete(pepper.id);
  util.contribution.delete(something.id);
  util.contribution.delete(blackbird.id);
  util.contribution.delete(taxman.id);
  util.contribution.delete(lucy.id);
});
});
});
