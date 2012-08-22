var builder = require('../lib/builders/mysql'),
    Query   = builder.Query,
    exec    = require('child_process').exec,
    expect  = require('expect.js');

before(function() { 
  var c = builder.connect('mysql://root@localhost:3306/mysql');
});

describe('mysql builder', function() {
  describe('#createTable', function() {
    it('should create table', function(done) {
      new Query().createTable('test', {id: 'int auto_increment primary key', test: 'varchar(32)'}, function(err) {
        expect(err).to.not.be.ok();
        done();
      });
    });
  });

  describe('#insert', function() {
    it('should insert data into table', function(done) {
      new Query().insert('test', {'test': 'testa'}, function(err) {
        expect(err).to.not.be.ok();
        done();
      });
    });
  });

  describe('#update', function() {
    it('should update data', function(done) {
      new Query().update('test', {'test': 'testo'})
      .where({id: 1})
      .exec(function(err) {
        expect(err).to.not.be.ok();
        done();
      });
    });
  });
    
  describe('#select', function() { 
    it('should return if called with a callback', function(done) {
      new Query().select('test', '*').exec().on('success', function(rows) {
        expect(rows).to.be.an('array');
        done();
      });
    });

    it('should return if called with #exec', function(done) {
      new Query().select('test', '*')
        .exec(function(err, rows) {
          expect(err).to.not.be.ok();
          expect(rows).to.be.an('array');
          done();
        });
    });
  });

  describe('#limit', function() {
    it('should return rows according to limit', function(done) {
      new Query().select('test', '*')
        .limit(1)
        .exec(function(err, rows) {
          expect(err).to.not.be.ok();
          expect(rows.length).to.be.equal(1);
          done();
        });
    });
  });
  
  describe('#orderBy', function() {

    it('should order DESC', function(done) {
      new Query()
        .insert('test', { test: 'ccc' })
        .exec(function() {
          new Query()
            .insert('test', { test: 'asd' })
            .exec(function() {
              new Query()
                .select('test', '*')
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
