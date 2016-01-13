var ServerlessHelpers = require('serverless-helpers-js').loadEnv();
var _ = require('underscore');
var chakram = require('chakram');
expect = chakram.expect;
//var expect = require('chai').expect;
//var assert = require('chai').assert;

var util = require('./util.js');

describe.only("Test protocol according to excel", function() {
  var biddingId;
  var contributionId1;
  var contributionId2;
  var p1, p2, p3, p4, p5;
  var systemRep;
  var arr = [];

  before('reset db, create 5 users and a bidding', function() {
    return util.cleanseDB()
      .then(function(res) {
        arr = [
          util.user.createN(5),
          util.bidding.create()
        ];
        return chakram.all(arr);
      })
      .then(function(res) {
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

  after('reset db', function() {
    return util.cleanseDB().then(function(res) {
      return chakram.wait();
    });
  });
  
  it("should cost tokens for submitting a contribution", function () {
    arr = [
      util.contribution.create({ userId: p1.id , biddingId: biddingId }),
      util.contribution.create({ userId: p2.id , biddingId: biddingId })
    ];
    return chakram.all(arr)
      .then(function(res) {
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

  it("should distribute rep according to step 1", function() {
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
        expect(p1.reputation).to.be.equal(0.196437);
        return util.getCachedRep()
      }).then(function(res) {
        expect(res.body.theValue).to.be.equal(0.996437);
        return chakram.wait();
      });
  });

  it("should distribute rep according to step 2", function() {
    return util.evaluation.create({
      biddingId: biddingId,
      userId: p2.id,
      evaluations: [{ contributionId: contributionId1, value: 0 }]
    }).then(function(res) {
      arr = [
        util.user.get(p1.id),
        util.user.get(p2.id),
        util.getCachedRep()
      ];
      return chakram.all(arr);
    }).then(function(res) {
      p1 = res[0].body;
      p2 = res[1].body;
      systemRep = res[2].body.theValue;
      expect(p1.reputation).to.be.equal(0.198428);
      expect(p2.reputation).to.be.equal(0.196452);
      expect(systemRep).to.be.equal(0.994880);
    });
  });

  it("should distribute rep according to step 3", function() {
    return util.evaluation.create({
      biddingId: biddingId,
      userId: p1.id,
      evaluations: [{ contributionId: contributionId2, value: 1 }]
    }).then(function(res) {
      arr = [
        util.user.get(p1.id),
        util.user.get(p2.id),
        util.getCachedRep()
      ];
      return chakram.all(arr);
    }).then(function(res) {
      p1 = res[0].body;
      p2 = res[1].body;
      systemRep = res[2].body.theValue;
      expect(p1.reputation).to.be.equal(0.194881);
      expect(p2.reputation).to.be.equal(0.196452);
      expect(systemRep).to.be.equal(0.991333);
    });
  });

  it("should distribute rep according to step 4", function() {
    return util.evaluation.create({
      biddingId: biddingId,
      userId: p3.id,
      evaluations: [{ contributionId: contributionId1, value: 1 }]
    }).then(function(res) {
      arr = [
        util.user.get(p1.id),
        util.user.get(p2.id),
        util.user.get(p3.id),
        util.getCachedRep()
      ];
      return chakram.all(arr);
    }).then(function(res) {
      p1 = res[0].body;
      p2 = res[1].body;
      p3 = res[2].body;
      systemRep = res[3].body.theValue;
      expect(p1.reputation).to.be.equal(0.200013);
      expect(p2.reputation).to.be.equal(0.198454);
      expect(p3.reputation).to.be.equal(0.195165);
      expect(systemRep).to.be.equal(0.993632);
    });
  });

  it("should distribute rep according to step 5", function() {
    return util.evaluation.create({
      biddingId: biddingId,
      userId: p4.id,
      evaluations: [{ contributionId: contributionId1, value: 1 }]
    }).then(function(res) {
      arr = [
        util.user.get(p1.id),
        util.user.get(p2.id),
        util.user.get(p3.id),
        util.user.get(p4.id),
        util.getCachedRep()
      ];
      return chakram.all(arr);
    }).then(function(res) {
      p1 = res[0].body;
      p2 = res[1].body;
      p3 = res[2].body;
      p4 = res[3].body;
      systemRep = res[4].body.theValue;
      expect(p1.reputation).to.be.equal(0.204674);
      expect(p2.reputation).to.be.equal(0.200472);
      expect(p3.reputation).to.be.equal(0.199713);
      expect(p4.reputation).to.be.equal(0.194559);
      expect(systemRep).to.be.equal(0.999418);
    });
  });

  it("should distribute rep according to step 6", function() {
    return util.evaluation.create({
      biddingId: biddingId,
      userId: p5.id,
      evaluations: [{ contributionId: contributionId1, value: 0 }]
    }).then(function(res) {
      arr = [
        util.user.get(p1.id),
        util.user.get(p2.id),
        util.user.get(p3.id),
        util.user.get(p4.id),
        util.user.get(p5.id),
        util.getCachedRep()
      ];
      return chakram.all(arr);
    }).then(function(res) {
      p1 = res[0].body;
      p2 = res[1].body;
      p3 = res[2].body;
      p4 = res[3].body;
      p5 = res[4].body;
      systemRep = res[5].body.theValue;
      expect(p1.reputation).to.be.equal(0.206743);
      expect(p2.reputation).to.be.equal(0.205699);
      expect(p3.reputation).to.be.equal(0.201731);
      expect(p4.reputation).to.be.equal(0.196525);
      expect(p5.reputation).to.be.equal(0.195114);
      expect(systemRep).to.be.equal(1.005812);
    });
  });

  it("should distribute rep according to step 7", function() {
    return util.evaluation.create({
      biddingId: biddingId,
      userId: p4.id,
      evaluations: [{ contributionId: contributionId2, value: 1 }]
    }).then(function(res) {
      arr = [
        util.user.get(p1.id),
        util.user.get(p2.id),
        util.user.get(p3.id),
        util.user.get(p4.id),
        util.user.get(p5.id),
        util.getCachedRep()
      ];
      return chakram.all(arr);
    }).then(function(res) {
      p1 = res[0].body;
      p2 = res[1].body;
      p3 = res[2].body;
      p4 = res[3].body;
      p5 = res[4].body;
      systemRep = res[5].body.theValue;
      expect(p1.reputation).to.be.equal(0.212004);
      expect(p2.reputation).to.be.equal(0.205699);
      expect(p3.reputation).to.be.equal(0.201731);
      expect(p4.reputation).to.be.equal(0.191603);
      expect(p5.reputation).to.be.equal(0.195114);
      expect(systemRep).to.be.equal(1.006151);
    });
  });

  it("should distribute rep according to step 8", function() {
    return util.evaluation.create({
      biddingId: biddingId,
      userId: p1.id,
      evaluations: [{ contributionId: contributionId2, value: 0 }]
    }).then(function(res) {
      arr = [
        util.user.get(p1.id),
        util.user.get(p2.id),
        util.user.get(p3.id),
        util.user.get(p4.id),
        util.user.get(p5.id),
        util.getCachedRep()
      ];
      return chakram.all(arr);
    }).then(function(res) {
      p1 = res[0].body;
      p2 = res[1].body;
      p3 = res[2].body;
      p4 = res[3].body;
      p5 = res[4].body;
      systemRep = res[5].body.theValue;
      expect(p1.reputation).to.be.equal(0.208466);
      expect(p2.reputation).to.be.equal(0.205699);
      expect(p3.reputation).to.be.equal(0.201731);
      expect(p4.reputation).to.be.equal(0.193643);
      expect(p5.reputation).to.be.equal(0.195114);
      expect(systemRep).to.be.equal(1.004653);
    });
  });

  it("should distribute rep according to step 9", function() {
    return util.evaluation.create({
      biddingId: biddingId,
      userId: p2.id,
      evaluations: [{ contributionId: contributionId2, value: 0 }]
    }).then(function(res) {
      arr = [
        util.user.get(p1.id),
        util.user.get(p2.id),
        util.user.get(p3.id),
        util.user.get(p4.id),
        util.user.get(p5.id),
        util.getCachedRep()
      ];
      return chakram.all(arr);
    }).then(function(res) {
      p1 = res[0].body;
      p2 = res[1].body;
      p3 = res[2].body;
      p4 = res[3].body;
      p5 = res[4].body;
      systemRep = res[5].body.theValue;
      expect(p1.reputation).to.be.equal(0.213980);
      expect(p2.reputation).to.be.equal(0.200749);
      expect(p3.reputation).to.be.equal(0.201731);
      expect(p4.reputation).to.be.equal(0.195646);
      expect(p5.reputation).to.be.equal(0.195114);
    });
  });

  it("should distribute rep according to step 10", function() {
    return util.evaluation.create({
      biddingId: biddingId,
      userId: p3.id,
      evaluations: [{ contributionId: contributionId2, value: 1 }]
    }).then(function(res) {
      arr = [
        util.user.get(p1.id),
        util.user.get(p2.id),
        util.user.get(p3.id),
        util.user.get(p4.id),
        util.user.get(p5.id),
        util.getCachedRep()
      ];
      return chakram.all(arr);
    }).then(function(res) {
      p1 = res[0].body;
      p2 = res[1].body;
      p3 = res[2].body;
      p4 = res[3].body;
      p5 = res[4].body;
      systemRep = res[5].body.theValue;
      expect(p1.reputation).to.be.equal(0.216145);
      expect(p2.reputation).to.be.equal(0.202780);
      expect(p3.reputation).to.be.equal(0.196832);
      expect(p4.reputation).to.be.equal(0.200776);
      expect(p5.reputation).to.be.equal(0.195114);
    });
  });

});