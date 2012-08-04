var builder = require('../lib/builders/postgresql'),
    exec    = require('child_process').exec,
    assert  = require('assert');

builder.connect('tcp://postgres@127.0.0.1/test');

describe('postgresql builder', function() {

  describe('#select', function() {

    it('should select row from db', function(done) {
      builder
        .select('test', '*')
        .where({test: 'harpdarp'})
        .exec(function(e, res) {
          res.length.should.equal(3);
          assert.equal(e, null);
          done();
        }); 
    });
  });

});
