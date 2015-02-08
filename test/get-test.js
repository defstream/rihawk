var RiakPBC = require('riakpbc');
var riak = RiakPBC.createClient();

var Get = require('../lib/streams/get');
new Get({
  client: riak,
  bucket: ['nfl_team', 'fake_bucket'],
  keys: ['SD', 'MIA', 'CHI', 'OAK','FAKETEAM', 'ATL']
}).on('data', function(data) {
  console.log('#data', data);
}).on('error', function(err) {
  console.log('#error', err);
}).on('end', function() {
  console.log('#end');
});