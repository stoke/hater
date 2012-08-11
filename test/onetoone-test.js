var hater  = require('../lib/hater'),
    assert = require('assert');

hater.dialect('postgresql', 'tcp://postgres@127.0.0.1/test');

var Model = hater.extend('model', {});

Model.schema({
  test: hater.Types.Integer()
});

var Other = hater.extend('other', {});

Other.schema({
  field: hater.Types.Integer()
});

describe('relationships', function() {

  before(function(done) {
    hater.Relationships.oneToOne(Model, Other);
    hater.sync()
      .on('success', done);
  });

  describe('oneToOne', function() {

    it('should setup right fields in Models', function() {
      Model._schema.other_id.should.equal('INT');
      Other._schema.model_id.should.equal('INT');
    });
    

    it('should load with fetch', function(done) {
      new Model({test: 1}).save(function(e, instance) {
        Model.find({where: {id: instance.get('id')}, fetch: ["others"]}, function(e, res) {
          assert.equal(true, Array.isArray(res[0].others));
          done();
        });
      });
    });
  });

});
