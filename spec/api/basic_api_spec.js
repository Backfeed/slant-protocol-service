var ServerlessHelpers = require('serverless-helpers-js').loadEnv();
var chakram = require('chakram');
expect = chakram.expect;
//var expect = require('chai').expect;
//var assert = require('chai').assert;

var URL = 'https://api.backfeed.cc/slantdev';
var userId = '701676b1-7866-44ef-a02f-2c2e7f40a30a';

var params =  {
    headers: { 'x-api-key': process.env.X_API_KEY }
};
describe("Slant Protocol API", function() {

    var createUserPost, userGET, nonUserGET, initialData;

    before("Initialize things for the tests", function () {
        initialData = {
            tokens: 2,
            reputation: 1
        };
        createUserPost = chakram.post(URL + '/users/', initialData, params);
        userGET = chakram.get(URL + '/users/' + userId, params);
        nonUserGET = chakram.get(URL + '/users/1', params);
    });

    it("should return 201 on success", function () {
        return expect(createUserPost).to.have.status(201);
    });

    it("should return 200 when finding a user", function () {
        return expect(userGET).to.have.status(200);
    });

    it("should return 404 when not finding a user", function () {
        return expect(nonUserGET).to.have.status(404);
    });

    describe("play with some users data", function () {

        var userData;

        before("Initialize things for the tests", function () {
            return createUserPost.then(function(respObj) {
                userData = respObj.body;
            });
        });

        it("should return r", function () {
            expect(userData.reputation).to.equal(1);
            return chakram.wait();
        });
    });
});
