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
      var key = keys.shift();

      if(!key) return;

      var Model = hater._models[key],
          rels  = hater._relationships;
      
      if (!Model._schema)
        throw new Error('There must be a schema');
      
      Model.addProperties({
        id: Types.Serial()
      });
      
      new Query()
        .skip()
        .createTable(Model._table, (builder.bind(Model))(Model._schema))
        .exec(function(e) {
          if (e)
            return em.emit('error', e);

          hater.synced = true;

          if(keys.length) {
            iterator(keys);
          } else {
            if(hater._queue.length) {
              hater._queue.forEach(function(q) {
                q.query.exec(q.callback);
              });
            }
            em.emit('success');
          }
        });
        
    })(Object.keys(hater._models));
  });

  return em;
};
