var hater   = require('./hater'),
    dialect = exports;
/**
 * Sets SQL dialect to use
 *
 * Examples:
 *
 *    dialect.use('postgresql');
 *
 * @param {String} dialect
 * @api public
 */

dialect.use = function(b) {
  hater.builder = require('./builders/' + b);
};
