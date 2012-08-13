var assert = require('assert'),
    hater  = require('../lib/hater');


hater.dialect('postgresql', 'tcp://postgres@localhost/test');

var One = hater.extend('one');

One.schema({
  one: hater.Types.String()
});

var Many = hater.extend('many');

Many.schema({
  many: hater.Types.String()
});

describe('relationships', function() {

  before(function(done) {
    hater.Relationships.oneToMany(One, Many);
    hater.sync().on('success', done);
  });

  describe('oneToMany', function() {
     
    it('should setup right fields in schema', function() {
      Many._schema.one_id.should.be.a('string');
      
      hater._relationships.belongsTo.many.indexOf('one').should.not.equal(-1);
      hater._relationships.hasMany.one.indexOf('many').should.not.equal(-1);
    });    
    
    it('should sync models', function(done) {
      var m = new One({one: 'lol', manies: [new Many({many: 'burp'})]});

      m.save(function(e) {
        One.findOne({ where: { id: m.get('id') }, fetch: ["manies"] }, function(e, res) {
          res.get('manies')[0].get('many').should.equal('burp'); 
          Many.findOne({ where: {id: res.get('manies')[0].get('id')}, fetch: ["one"]}, function(e, res) {
            res.get('one').get('one').should.equal('lol');
            done();
          });
        });

      });
    }); 
  });

});
