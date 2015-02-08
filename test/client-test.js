var mocha = require('mocha');
var chai = require("chai");
var expect = chai.expect;

var RiakPBC = require('riakpbc');
var riak = RiakPBC.createClient();

var Client = require('../lib/client');
describe('Client', function() {
  var Get = require('../lib/streams/get');
  it('get(bucket,key)', function(done) {

    new Client().get('nfl_team', 'MIA').on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', data);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });
  it('get(bucket,[key])', function(done) {
    new Client().get('nfl_team', ['SD', 'MIA', 'CHI', 'OAK', 'FAKETEAM', 'ATL']
    ).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });
  
  it('get([bucket],[key])', function(done) {
    new Client().get(['nfl_team', 'fake_bucket'], ['SD', 'MIA', 'CHI', 'OAK', 'FAKETEAM', 'ATL']
    ).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });
});
