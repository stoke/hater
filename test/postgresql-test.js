var builder = require('../lib/builders/postgresql'),
    Query   = builder.Query;
    exec    = require('child_process').exec,
    expect  = require('expect.js'),
    assert  = require('assert');

describe('postgresql builder', function() {

  builder.connect('tcp://postgres@127.0.0.1/test');

  describe('#drop', function() {
    
    it('should drop table if exists from db', function(done) {
      new Query()
        .drop('hater')
        .exec(function(e) {
          assert.equal(null, e);
          done();
        });
    });

  });

  describe('#createTable', function() {

    it('should create table', function(done) {
      new Query()
        .createTable('hater', { id: 'serial', test: 'varchar(32)'})
        .exec(function(e) {
          assert.equal(null, e);
          done();
        });
    });

  });

  describe('#insert', function() {
  
    it('should insert row into the db', function(done) {
      new Query()
        .insert('hater', { test: 'burp' })
        .exec(function(e, res) {
          assert.equal(e, null);
          done();
        });
    });

  });

  describe('#select', function() {

    it('should select row from the db', function(done) {
      var query = new Query()
        .select('hater', '*')
        .where({test: 'burp'});

      query.on('success', function(data) {
        data.length.should.equal(1);
        done();
      });

      query.exec();
    });
  });

  describe('#update', function() {
    
    it('should update row in the db', function(done) {
      new Query()
        .update('hater', {test: 'asd'})
        .where({id: 1})
        .exec(function(e) {
          assert.equal(null, e);
          new Query()
            .select('hater', '*')
            .where({ id: 1 })
            .exec(function(e, r) {
              (r && r[0] && r[0].test).should.equal('asd');
              assert.equal(e, null);
              done();
            });
        });

    });
  });

  describe('#limit', function() {
    it('should return rows according to limit', function(done) {
      new Query().select('hater', '*')
        .limit(1)
        .exec(function(err, rows) {
          expect(err).to.not.be.ok();
          expect(rows.length).to.be.equal(1);
          done();
        });
    });
  });

  describe('#delete', function() {

    it('should delete row from db', function(done) {
      var query = new Query()
        .delete('hater')
        .where({ id: 1 })
        .exec(function(e) {
          assert.equal(e, null);
          new Query()
            .select('hater', '*')
            .where({id : 1})
            .exec(function(e, res) {
              res.length.should.equal(0);
              done();
            });
        });
    });
  });

  describe('#orderBy', function() {

    it('should order DESC', function(done) {
      new Query()
        .insert('hater', { test: 'ccc' })
        .exec(function() {
          new Query()
            .insert('hater', { test: 'asd' })
            .exec(function() {
              new Query()
                .select('hater', '*')
                .orderBy({ id: 'DESC' })
                .exec(function(e, res) {
                  res[0].id.should.be.above(res[1].id);
                  done();
                });
            });
        });
    });
  });
});
