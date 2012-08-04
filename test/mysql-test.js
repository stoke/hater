var builder = require('../lib/builders/mysql'),
    exec    = require('child_process').exec,
    expect  = require('expect.js');

before(function(done) {
  exec('mysql -u '+process.env.MYSQL_USERNAME+' -p'+process.env.MYSQL_PASSWORD+' < mysql-test.sql', function() { // populating db ugly-and-lazy style
    var c = builder.connect('mysql://'+process.env.MYSQL_USERNAME+':'+process.env.MYSQL_PASSWORD+'@localhost/test');
    done();
  });
});

describe('mysql builder', function() {
  describe('#select', function() {
    it('should return if called with a callback', function(done) {
      builder.select('test', '*', function(err, rows) {
        expect(err).to.not.be.ok();
        expect(rows).to.be.an('array');
        done()
      });
    });

    it('should return if called with #exec', function(done) {
      builder.select('test', '*')
        .exec(function(err, rows) {
          expect(err).to.not.be.ok();
          expect(rows).to.be.an('array');
          done();
        });
    });
  });

  describe('#limit', function() {
    it('should return rows according to limit', function(done) {
      builder.select('test', '*')
        .limit(1)
        .exec(function(err, rows) {
          expect(err).to.not.be.ok();
          expect(rows.length).to.be.equal(1);
          done();
        });
    });
  });

  describe('#insert', function() {
    it('should insert data into table', function(done) {
      builder.insert('test', {'test': 'testa'}, function(err) {
        expect(err).to.not.be.ok();
        done();
      });
    });
  });

  describe('#update', function() {
    it('should update data', function(done) {
      builder.update('test', {'test': 'testo'})
      .where({id: 1})
      .exec(function(err) {
        expect(err).to.not.be.ok();
        done();
      });
    });
  });

});
