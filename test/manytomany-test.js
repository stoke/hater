var assert = require('assert'),
    hater  = require('../lib/hater');

hater.connect('mysql', 'mysql://root@localhost/test');

var M = hater.define('m');
M.schema({
  name: hater.Types.String()
});
var G = hater.define('g');
G.schema({
  nick: hater.Types.String()
});
var C = hater.define('c');
C.schema({
  c: hater.Types.Integer()
});


hater.Relationships.manyToMany(M, G);
hater.Relationships.manyToMany(M, C);

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
          G.find({fetch: ["ms"]}, function(e, res) {
            var first = res.shift();
            first.get('ms')[0].get('name').should.equal('asd');
            M.find({where: {id: 1}, fetch: ["gs"]}, function(e, res) {
              res[0].get('gs')[0].get('nick').should.equal('lol');
              done();
            });
          });        
        });
      });
    });
    
    it('should filter', function(done) {
      var a = new M({name: 'lol'});

      a.set('gs', [new G({nick:'b'}), new G({nick:'c'})]);
      a.save(function(e) {
        a.load({fetch: ["gs"], where: { gs: { nick: 'b'} } }, function(e) {
          a.get('gs')[0].get('nick').should.equal('b');
          a.get('gs')[0].destroy(function(e) {
            done();
          });
        });
      });
    });

    it('should work with unlink', function(done) {
      M.findOne({ where: { name: 'asd' }, fetch: ["gs"] }, function(e, res) {
        var n = res.get('gs').length;
        res.unlink(res.get('gs')[0]);
        M.findOne({ where: {name: 'asd'}, feetch: ["gs"]}, function(e, res) {
          n.should.not.eql(res.get('gs'));
          done();
        });
      });
    });

  });

});
