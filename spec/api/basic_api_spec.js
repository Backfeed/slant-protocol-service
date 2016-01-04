var ServerlessHelpers = require('serverless-helpers-js').loadEnv();
var _ = require('underscore');
var chakram = require('chakram');
expect = chakram.expect;
//var expect = require('chai').expect;
//var assert = require('chai').assert;

var URL = 'https://api.backfeed.cc/slantdev';
var userId = '701676b1-7866-44ef-a02f-2c2e7f40a30a';

var params =  {
    headers: { 'x-api-key': process.env.X_API_KEY }
};

var userData = {
    tokens: 2,
    reputation: 1
};
var createUser = function() { return chakram.post(URL + '/users/', userData, params) };
var getUser    = function(id) { return chakram.get(URL + '/users/' + id, params) };
var deleteUser = function(id) { return chakram.delete(URL + '/users/' + id, {}, params) };

var createBidding = function() { return chakram.post(URL + '/biddings/', {}, params) };
var getBidding    = function(id) { return chakram.get(URL + '/biddings/' + id, params) };
var deleteBidding = function(id) { return chakram.delete(URL + '/biddings/' + id, {}, params) };

var createContribution = function(body) { return chakram.post(URL + '/contributions/', body, params) };
var getContribution    = function(id) { return chakram.get(URL + '/contributions/' + id, params) };
var deleteContribution = function(id) { return chakram.delete(URL + '/contributions/' + id, {}, params) };

var createEvaluations = function(body) { return chakram.post(URL + '/evaluations/', body, params) };
var getEvaluation     = function(id) { return chakram.get(URL + '/evaluations/' + id , params) };
var deleteEvaluation  = function(id) { return chakram.delete(URL + '/evaluations/' + id, {}, params) };

describe("Slant Protocol API", function() {


    before("Initialize things for the tests", function () {
    });

    xit("should return 201 on success", function () {
        return expect(createUser()).to.have.status(201);
    });

    xit("should return 200 when finding a user", function () {
        return expect(getUser(userId)).to.have.status(200);
    });

    it("should return 404 when not finding a user", function () {
        var nonUserGET = chakram.get(URL + '/users/1', params);
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
            _.times(5, function(n) { multipleResponses.push(createUser()) });
            return chakram.all(multipleResponses).then(function(responses) {
                var users = responses.map(function(response) {
                    return response.body;
                });
                george = users[0]; paul = users[1]; john = users[2]; ringo = users[3]; pete = users[4];
                expect(george.createdAt).to.be.a('number');
                expect(paul.tokens).to.equal(2);
                expect(john.id).to.have.length.above(2);
                expect(ringo.reputation).to.equal(1);
                //console.log(paul);
            });
        });

        it("should create albums - Biddings", function () {
            this.timeout(10000);
            var multipleResponses = [];
            _.times(4, function(n) { multipleResponses.push(createBidding()) });
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
            multipleResponses.push(createContribution({ 'userId': george.id, 'biddingId': abbey.id }));
            multipleResponses.push(createContribution({ 'userId': paul.id, 'biddingId': white.id }));
            multipleResponses.push(createContribution({ 'userId': john.id, 'biddingId': revolver.id }));
            multipleResponses.push(createContribution({ 'userId': ringo.id, 'biddingId': pepper.id }));
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
            multipleResponses.push(createEvaluations({ 'userId': george.id, 'biddingId': abbey.id, evaluations: [{ 'contributionId': something.id, 'value': 1}] }));
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
            deleteUser(george.id).then(function(res) {
                //console.log(res.body);
                expect(res.body.id).to.be.equal(george.id);
                return chakram.wait();
            });
            deleteUser(paul.id).then(function(res) {
                //console.log(res.body);
                expect(res.body.id).to.be.equal(paul.id);
                return chakram.wait();
            });
            deleteUser(john.id);
            deleteUser(ringo.id);
            deleteUser(pete.id);
            deleteBidding(abbey.id);
            deleteBidding(white.id);
            deleteBidding(revolver.id);
            deleteBidding(pepper.id);
            deleteContribution(something.id);
            deleteContribution(blackbird.id);
            deleteContribution(taxman.id);
            deleteContribution(lucy.id);
        });
    });
});
