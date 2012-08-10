var assert = require('assert'),
    hater  = require('../lib/hater'),
    Types  = hater.Types;

hater.dialect('postgresql', 'tcp://postgres@127.0.0.1/test');
var Relationship = hater.extend('relationship', {});

Relationship.schema({
  test: Types.String
});

var Relationship2 = hater.extend('relationship2', {});

Relationship2.schema({
  testo: Types.String
});

Relationship.hasOne(Relationship2);

before(function() {
  Relationship.sync();
  Relationship2.sync();
});

describe('relationships', function() {

  describe('hasOne', function() {

    it('should inject correct methods', function() {
      new Relationship().createRelationship2.should.be.a('function');
      
      Relationship._relationships.hasOne.indexOf('relationship2').should.not.equal(-1);
    });

  });

});