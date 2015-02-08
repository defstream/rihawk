var mocha = require('mocha');
var chai = require("chai");
var expect = chai.expect;

var RiakPBC = require('riakpbc');
var riak = RiakPBC.createClient();


describe('Get', function() {
  var Get = require('../lib/streams/get');
  it('get(bucket,key)', function(done) {
    new Get({
      client: riak,
      bucket: 'nfl_team',
      keys: 'SD'
    }).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });
  it('get(bucket,[key])', function(done) {
    new Get({
      client: riak,
      bucket: ['nfl_team'],
      keys: ['SD', 'MIA', 'CHI', 'OAK', 'FAKETEAM', 'ATL']
    }).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });
  it('get([bucket],[key])', function(done) {
    new Get({
      client: riak,
      bucket: ['nfl_team', 'fake_bucket'],
      keys: ['SD', 'MIA', 'CHI', 'OAK', 'FAKETEAM', 'ATL']
    }).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });
});
