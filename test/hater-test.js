var assert = require('assert'),
    hater  = require('../lib/hater');

describe('hater', function() {
  
  describe('#define', function() {
    
    it('should have .define', function() {
      hater.define.should.be.a('function');      
    });

  });

  describe('#connect', function() {

    it('should have .connect', function() {
      hater.connect.should.be.a('function');
    });

  });

});
