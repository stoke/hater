var hater   = require('./hater'),
    builder = require('./types').builder,
    Emitter = require('eventemitter2').EventEmitter2;

/**
 * Create table on database
 *
 * Examples:
 *
 *    hater.sync().on('success', function() { ... });
 *
 * @api public
 */
 
var sync = module.exports = function() {
  var em    = new Emitter(),
      Query = hater.builder.Query,
      Types = hater.Types;
  
  process.nextTick(function() {  
    (function iterator(keys) {
      var Model = hater._models[keys.shift()],
          rels  = hater._relationships;
      
      if (!Model._schema)
        throw new Error('There must be a schema');

      Model.addProperties({
        id: Types.Serial()
      });
      
      if(rels.oneToOne[Model._name]) {

        rels.oneToOne[Model._name].forEach(function(childName) {
          var Other = hater._models[childName];
        
          var mProps = {};
          mProps[Other._name + 'Id'] = Types.Integer();
          Model.addProperties(mProps);

          var oProps = {};
          oProps[Model._name + 'Id'] = Types.Integer();
          Other.addProperties(oProps);
          });

      }

      new Query()
        .createTable(Model._table, builder(Model._schema))
        .exec(function(e) {
          if (e) {
            em.emit('error', e);
          }
          return keys.length ?
            iterator(keys) :
            em.emit('success') ;
        }); 
    })(Object.keys(hater._models));
  });

  return em;
};
