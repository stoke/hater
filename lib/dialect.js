var hater   = require('./hater'),
    dialect = exports;
/**
 * Sets SQL dialect to use
 *
 * Examples:
 *
 *    dialect.use('postgresql', 'tcp://root@127.0.0.1/test');
 *
 * @param {String} dialect
 * @param {String} connString
 * @api public
 */

dialect.use = function(b, connStr) {
  hater.builder = typeof b === 'string' ?
    require('./builders/' + b) :
    b ;
    
  hater.builder.connect(connStr);
};
