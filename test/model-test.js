var assert = require('assert'),
    expect = require('expect.js'),
    hater  = require('../lib/hater');

hater.connect('postgresql', 'tcp://postgres@127.0.0.1/test');

var Model = hater.define('table', {
  test: function() {}
});

Model.schema({
  test: hater.Types.String()
});

describe('model', function() {
  
  describe('Constructor', function() {

    it('should have some properties', function() {

      Model.update.should.be.a('function');
      Model.destroy.should.be.a('function');
      Model.find.should.be.a('function');
      Model.toJSON.should.be.a('function');
      Model.create.should.be.a('function');
      Model._table.should.equal('tables');
                                                        
    });

  });

  describe('Instance', function() {

    it('should have some properties', function() {

      var m = new Model();

      m.update.should.be.a('function');
      m.destroy.should.be.a('function');
      m.find.should.be.a('function');
      m.toJSON.should.be.a('function');
      m.create.should.be.a('function');
      m._table.should.equal('tables');
      m._properties.should.be.a('object');
      m.test.should.be.a('function');
      m.on.should.be.a('function');

    });

  });

});

