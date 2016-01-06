var ServerlessHelpers = require('serverless-helpers-js').loadEnv();
var _ = require('underscore');
var chakram = require('chakram');
expect = chakram.expect;
//var expect = require('chai').expect;
//var assert = require('chai').assert;

var util = require('./util.js');

describe("Test protocol according to excel", function() {
  var biddingId;
  var contributionId1;
  var contributionId2;
  var p1, p2, p3, p4, p5;
  var arr = [];

  before(function() {
    return util.cleanseDB()
      .then(function(res) {
        arr.push(util.user.createN(5));
        arr.push(util.bidding.create());
        return chakram.all(arr);
      })
      .then(function(res) {
        arr = [];
        var users = res[0];
        biddingId = res[1].body.id;
        p1 = users[0];
        p2 = users[1];
        p3 = users[2];
        p4 = users[3];
        p5 = users[4];
        return chakram.wait();
      });
  });

  after(function() {
    return util.cleanseDB().then(function(res) {
      return chakram.wait();
    });
  });
  
  it("should cost tokens for submitting a contribution", function () {
    arr.push(util.contribution.create({ userId: p1.id , biddingId: biddingId }));
    arr.push(util.contribution.create({ userId: p2.id , biddingId: biddingId }));
    return chakram.all(arr)
      .then(function(res) {
        arr = [];
        contributionId1 = res[0].body.id;
        contributionId2 = res[1].body.id;
        return util.user.get(p1.id);
      })
      .then(function(res) {
        p1 = res.body;
        expect(p1.tokens).to.be.equal(11) // TODO :: change for real value after reponse from protocol guys
        return chakram.wait();
      });
  });

  it("should burn rep to submit an evaluation", function() {
    return util.evaluation.create({ 
        biddingId: biddingId,
        userId: p1.id,
        evaluations: [{ contributionId: contributionId1, value: 1 }]
      })
      .then(function(res) {
        return util.user.get(p1.id);
      })
      .then(function(res) {
        p1 = res.body;
        expect(util.pp(p1.reputation)).to.be.equal(0.1976757815);
        return chakram.wait();
      });
  });

});