var ServerlessHelpers = require('serverless-helpers-js').loadEnv();
var _ = require('underscore');
var chakram = require('chakram');
expect = chakram.expect;
//var expect = require('chai').expect;
//var assert = require('chai').assert;

var util = require('./util.js');

describe("Test protocol according to excel", function() {
  it("should work", function () {
    this.timeout(10000);
    var biddingId;
    var contributionId1;
    var contributionId2;
    var p1, p2, p3, p4, p5;
    var arr = [];

    // TODO :: delete DB before anything!

    arr.push(util.user.createN(5));
    arr.push(util.bidding.create());

    return chakram.all(arr)
      .then(function(res) {
        var users = res[0];
        p1 = users[0];
        p2 = users[1];
        p3 = users[2];
        p4 = users[3];
        p5 = users[4];
        var biddingId = res[1].body.id;
        console.log('users', users);
        console.log('biddingId', biddingId);
        arr = [];
        arr.push(util.contribution.create({ userId: p1.id , biddingId: biddingId }));
        arr.push(util.contribution.create({ userId: p2.id , biddingId: biddingId }));
        return chakram.all(arr);
      })
      .then(function(res) {
        contributionId1 = res[0].body.id;
        contributionId2 = res[1].body.id;
        return util.evaluation.create({ 
          biddingId: biddingId,
          userId: p1.id,
          evaluations: [{ contributionId: contributionId1, value: 1 }]
        });
      })
      .then(function(res) {
        return util.user.get(p1.id);
      })
      .then(function(res) {
        p1 = res.body;
        expect(p1.reputation).to.be.equal(0.198920125174837);
        return chakram.wait();
      });

  });
});