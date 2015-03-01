var mocha = require('mocha');
var chai = require("chai");
var expect = chai.expect;

var RiakPBC = require('riakpbc');
var riak = RiakPBC.createClient();


describe('Get', function() {
  var GetIndex = require('../lib/streams/getIndex');
  it('getIndex(bucket,key)', function(done) {
    new GetIndex({
      client: riak,
      bucket: 'relationship',
      index: 'subject:subjectId_predicate_bin',
      value: 'user:A_likes'
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




