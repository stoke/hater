var builder = require('../lib/builders/postgresql'),
    exec    = require('child_process').exec,
    assert  = require('assert');

before(function(done) {
  exec('psql -f postgresql.sql', function() {
    builder.connect('tcp://postgres@localhost/test');
    done();
  });
});

describe('postgresql builder', function() {

  describe('#select', function(done) {
    builder
      .select('test', '*')
      .where({test: 'harpdarp'})
      .exec(function(e, res) {
        console.log(res);
        done();
      }); 
  });

});
