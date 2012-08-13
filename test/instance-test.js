var hater  = require('../lib/hater'),
    expect = require('expect.js'),
    assert = require('assert');

hater.dialect('postgresql', 'tcp://postgres@localhost/test');

var Model = hater.extend('instance', {});

Model.schema({
  test: hater.Types.String({length: 32})
});

describe('Instance', function() {

  before(function(done) {
    hater.sync()
      .on('success', done);
  });

  describe('#create', function() {

    it('should create new row', function(done) {
      Model.create({ test: 'asd' }, function(e, res) {
        assert.equal(null, e);
        done();
      }); 

    });

  });

  describe('find', function() {
    it('should find rows', function(done) {
      Model.find('*', function(e, r) {
        expect(e).to.not.be.ok();
        expect(r).to.be.an('array');
        done();
      });
    });
  });

  describe('#save', function() {
    it('should create a row when called without id', function(done) {
      var model = new Model({test: 'lol'});
      model.save(function(e, r) {
        expect(e).not.to.be.ok();
        done();
      });
    });

    it('should save the row when called from find (with id)', function(done) {
      Model.find('*', function(e, r) {
        r[0].set('test', 'testa');
        r[0].save(function(e, r) {
          expect(e).not.to.be.ok();
          done();
        });
      });
    });
  });

  describe('#destroy', function() {
    it('should destroy the row when called from find (with id)', function(done) {
      Model.find('*', function(e, r) {
        r[0].destroy(function(e) {
          Model.find('*', function(e, v) {
            expect(e).not.to.be.ok();
            expect(r[0].get('id')).not.to.eql(v[0].get('id'));
            done();
          });
        });
      });
    });

    it('should destroy the row', function(done) {
      Model.find('*', function(e, r) {
        Model.destroy({id: r[0].get('id')}, function(e, r) {
          expect(e).not.to.be.ok();
          done();
        });
      });
    });
  });

  describe('#findOrCreate', function() {
    it('should find when a row exist', function(done) {
      Model.findOrCreate({ test: 'asd' }, function(e, r) {
        Model.findOrCreate({ test: 'asd' }, function(e, ro) {
          expect(r[0].get('id')).to.be.eql(ro[0].get('id'));
          done();
        });
      });
    });

    it("should create when a row doesn't exist", function(done) {
      Model.findOrCreate({ test: 'test' }, function(e, r) {
        expect(e).to.not.be.ok();
        expect(r).to.be.an('array');
        expect(r[0].get('test')).to.be.eql('test');
        done();
      });
    })
  });

  describe('#findOne', function() {
    it('should return first element when a row exist', function(done) {
      Model.findOne({where: {test: 'asd'}}, function(e, r) {
        expect(e).to.not.be.ok();
        expect(r).to.not.be.an('array');
        done();
      });
    });
    
    it('should return null when a row does not exist', function(done) {
      Model.findOne({where: {test: 'unexistent'}}, function(e, r) {
        expect(e).to.not.be.ok();
        expect(r).to.not.be.ok();
        done();
      });
    });
  });

});
