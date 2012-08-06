var hater  = require('../lib/hater'),
    assert = require('assert');

hater.dialect('postgresql', 'tcp://postgres@localhost/test');

var Model = hater.extend('instance', {});

before(function(done) {
  new (hater.builder.Query)()
    .createTable('instance', { id: 'serial', test: 'varchar(32)' })
    .exec(function(e) {
      done();
    });
});

describe('Instance', function() {
 
  describe('#create', function() {

    it('should create new row', function(done) {
      Model.create({ test: 'asd' }, function(e, res) {
        assert.equal(null, e);
        res.get('id').should.be.a('number');
        res.get('test').should.equal('asd');
        done();
      }); 

    });

  });


});
