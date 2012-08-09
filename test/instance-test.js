var hater  = require('../lib/hater'),
    expect = require('expect.js'),
    assert = require('assert');

hater.dialect('postgresql', 'tcp://postgres@localhost/test');

var Model = hater.extend('instance', {});

before(function(done) {
  new (hater.builder.Query)()
    .createTable('instances', { id: hater.Types.Serial(), test: hater.types.String({length: 32}) })
    .exec(function(e) {
      done();
    });
});

describe('Instance', function() {
 
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

  describe('#sync', function() {
    it('should create a table', function(done) {
      var Model = hater.extend('testsync', {});
      
      Model.schema({
        id: 'serial',
        test: 'varchar(32)'
      });
      
      Model
        .sync()
        .on('error', function(err) {
          throw err; // this should never happen
        })
        .on('success', function() {
          done();
        });
    });
  });

});
