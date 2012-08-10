var assert = require('assert'),
    hater  = require('../lib/hater');

describe('hater', function() {
  
  describe('#extend', function() {
    
    it('should have .extend', function() {
      hater.extend.should.be.a('function');      
    });

  });

  describe('#dialect', function() {

    it('should have .dialect', function() {
      hater.dialect.should.be.a('function');
    });

  });

});
