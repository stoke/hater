var assert = require('assert'),
    expect = require('expect.js'),
    hater  = require('../lib/hater');

var Model = hater.extend('test', {connection: 'mysql://'+process.env.MYSQL_USERNAME+':'+process.env.MYSQL_PASSWORD+'@localhost/test'}, {
  test: function() {}
});


describe('model', function() {
  describe('#create', function() {
    it('should create a row', function(done) {
      Model.create({test: 'test'}, function(e, r) {
        expect(e).not.to.be.ok();
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
        r[0].destroy(function(e, r) {
          expect(e).not.to.be.ok();
          done();
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
});
