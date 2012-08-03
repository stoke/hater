var builder = require('../lib/builders/mysql'),
    exec    = require('child_process').exec,
    expect  = require('expect.js');

before(function(done) {
  exec('mysql -u '+process.env.MYSQL_USERNAME+' -p'+process.env.MYSQL_PASSWORD+' < mysql_test.sql', function() { // populating db ugly-and-lazy style
    builder.connect('mysql://'+process.env.MYSQL_USERNAME+':'+process.env.MYSQL_PASSWORD+'@localhost/test');
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

  describe('#where', function() {
    it('should return rows according to the clause', function(done) {
      builder.select('test', '*')
        .where({id: 1})
        .exec(function(err, rows) {
          expect(err).to.not.be.ok();
          expect(rows[0].id).to.be.equal(1);
          done();
        });
    });
  });
});
