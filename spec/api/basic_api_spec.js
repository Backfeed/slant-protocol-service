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

describe("HTTP assertions", function () {
    it("should make HTTP assertions easy", function () {
        var response = chakram.get(URL + '/users/' + userId, params);
        expect(response).to.have.status(200);
        expect(response).to.have.header("content-type", "application/json");
        expect(response).not.to.be.encoded.with.gzip;
        //expect(response).to.comprise.of.json({
        //    args: {
        //        "id": "701676b1-7866-44ef-a02f-2c2e7f40a30a",
        //        "createdAt": 1451419694531,
        //        "tokens": 10,
        //        "biddingCount": 0,
        //        "reputation": 11
        //    }
        //});
        return chakram.wait();
    });
});
