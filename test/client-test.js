var mocha = require('mocha');
var chai = require("chai");
var expect = chai.expect;

var RiakPBC = require('riakpbc');
var riak = RiakPBC.createClient();

var Client = require('../lib/client');
describe('Client', function() {
  var Get = require('../lib/streams/get');
  it('put(bucket,key)', function(done) {
    new Client({}).put('test_data', 'A', {
      name: 'Albert Ainstein'
    }).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });
  it('get(bucket,key)', function(done) {
    new Client({}).get('nfl_team', 'MIA').on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', data);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });
  it('get(bucket,[key])', function(done) {
    new Client().get('nfl_team', ['SD', 'MIA', 'CHI', 'OAK', 'FAKETEAM', 'ATL']).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });

  it('get([bucket],[key])', function(done) {
    new Client().get(['nfl_team', 'fake_bucket'], ['SD', 'MIA', 'CHI', 'OAK', 'FAKETEAM', 'ATL']).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });

  it('getIndex(bucket,index,[value])', function(done) {
    new Client().getIndex('nfl_team', 'team_bin', ['SD', 'MIA', 'CHI', 'OAK', 'FAKETEAM', 'ATL']).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });

  it('putCrdt(bucket,key,[value])', function(done) {
    new Client().putCrdt('nfl_teams_count', 'alls', {
      counter_op: {
        increment: 1
      }
    }, {
      type: 'counters'
    }).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });


  it('getCrdt(bucket,key,[value])', function(done) {
    new Client().getCrdt('nfl_teams_count', 'alls', { type: 'counters'}).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });


  it('updateCounter(bucket,key,[value])', function(done) {
    new Client().updateCounter('nfl_teams_count', 'alls', 1, {
      type: 'counters'
    }).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });

  it('updateCounter(bucket,key,[value])', function(done) {
    new Client().updateCounter('nfl_teams_count', 'alls', -1, {
      type: 'counters'
    }).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });


  it('getCounter(bucket,key,[value])', function(done) {
    new Client().getCounter('nfl_teams_count', 'alls', { type: 'counters'}).on('data', function(data) {
      console.log('#data', data);
    }).on('error', function(err) {
      console.log('#error', err);
    }).on('end', function() {
      console.log('#end');
      done();
    });
  });
});


