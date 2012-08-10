var assert = require('assert'),
    hater  = require('../lib/hater'),
    Types  = hater.Types;

hater.dialect('mysql', 'mysql://root@127.0.0.1/test');

var Relationship = hater.extend('relationship', {});

Relationship.schema({
  test: Types.String()
});

var Relationship2 = hater.extend('relationship2', {});

Relationship2.schema({
  testo: Types.String()
});

Relationship.hasOne(Relationship2);

before(function() {
  Relationship.sync();
  Relationship2.sync();
});

describe('relationships', function() {

  describe('hasOne', function() {
    
    var Model;

    before(function(done) {
      new Relationship({test: 'asd'}).save(function(e, instance) {
        Model = instance;
        done();
      });
    });

    it('should inject correct methods', function() {
      Model.createRelationship2.should.be.a('function');
      Model.getRelationship2s.should.be.a('function');    
      Relationship._relationships.hasOne.indexOf('relationship2').should.not.equal(-1);
    });

    it('should enable child creation', function(done) {
      Model.createRelationship2({
        testo: 'testoz'
      }, function(e, instance) {
        instance.get('testo').should.equal('testoz');
        done();
      });
    });

    it('should enable child lookup', function(done) {
      Model.getRelationship2s(function(e, instances) {
        instances[0].get('testo').should.equal('testoz');
        done();
      });
    });

  });

});
