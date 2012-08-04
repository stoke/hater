var builder = require('../lib/builders/postgresql'),
    Query   = builder.Query;
    exec    = require('child_process').exec,
    assert  = require('assert');


before(function(done) {
  builder.connect('tcp://postgres@127.0.0.1/test');
  done();
});  

describe('postgresql builder', function() {

  describe('#insert', function() {
  
    it('should insert row into the db', function(done) {
      new Query()
        .insert('test', { test: 'burp' })
        .exec(function(e, res) {
          assert.equal(e, null);
          done();
        });
    });

  });

  describe('#select', function() {

    it('should select row from the db', function(done) {
      new Query()
        .select('test', '*')
        .where({test: 'burp'})
        .exec(function(e, res) {
          res.length.should.equal(2);
          assert.equal(e, null);
          done();
        }); 
    });
  });

});
