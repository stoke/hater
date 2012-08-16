var hater  = require('../lib/hater'),
    assert = require('assert');

hater.connect('postgresql', 'tcp://postgres@127.0.0.1/test');

var Model = hater.define('model', {});

Model.schema({
  test: hater.Types.Integer()
});

var Other = hater.define('other', {});

Other.schema({
  field: hater.Types.Integer()
});

describe('relationships', function() {

  before(function() {
    hater.Relationships.oneToOne(Model, Other);
  });

  describe('oneToOne', function() {

    it('should setup right fields in Models', function() {
      Model._schema.other_id.should.be.a('object');
      Other._schema.model_id.should.be.a('object');
    });
    

    it('should load with fetch', function(done) {
      var child = new Other({field: 2});
      var model = new Model({test: 1});
      
      model.set('other', child);
      model.save(function(e, instance) {
        Model.find({where: {id: instance.get('id')}, fetch: ["other"]}, function(e, res) {
          res[0].get('test').should.equal(1);
          res[0].get('other').get('field').should.equal(2);
          Other.find({where: {id: res[0].get('other').get('id')}, fetch: ["model"]}, function(e, res) {
            res[0].get('model').get('test').should.equal(1);
            done();
          });
        });
      });
    });
  });

});
