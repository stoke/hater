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
