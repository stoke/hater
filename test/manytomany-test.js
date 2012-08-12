var assert = require('assert'),
    hater  = require('../lib/hater');

hater.dialect('postgresql', 'tcp://postgres@localhost/test');

var M = hater.extend('m');
M.schema({
  name: hater.Types.String()
});
var G = hater.extend('g');
G.schema({
  nick: hater.Types.String()
});

hater.Relationships.manyToMany(M, G);

describe('relationships', function() {

  before(function(done) {
    hater.sync().on('success', done);
  });

  describe('manyToMany', function() {
    
    it('should setup right model', function() {
      hater._models.mG.should.be.a('function');

      hater._relationships.manyToMany.m.indexOf('g').should.not.equal(-1);
      hater._relationships.manyToMany.g.indexOf('m').should.not.equal(-1);
    });

    it('should save in right table', function(done) {
      var m = new M({name: 'asd'});

      m.set('gs', [new G({nick:'lol'})]);

      m.save(function(e) {
        hater._models.mG.find({}, function(err, res) {
          G.find({fetch: ["m"]}, function(e, res) {
            var first = res.shift();
            first.get('ms')[0].get('name').should.equal('asd');
            M.find({where: {id: 1}, fetch: ["g"]}, function(e, res) {
              res[0].get('gs')[0].get('nick').should.equal('lol');
              done();
            });
          });        
        });
      });
    });

  });

});
