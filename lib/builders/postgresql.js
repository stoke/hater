var pg      = require('pg'),
    optimal = require('optimal'),
    builder = exports;

/**
 * PostgreSQL Connection
 */

var client;

/**
 * Connects to database
 *
 * Examples:
 *
 *    builder.connect('tcp://postgres:1234@localhost/postgres');
 *
 * @param {String} conn
 * @api private
 */

builder.connect = function(connStr) {
  client = new pg.Client(connStr);
  client.connect();
};

/**
 * Selects row from the database
 * 
 * Examples:
 *    
 *    builder.select('name', '*', { where: {id: 1} }, function(e, res) { ... });
 * 
 * @param {String} table
 * @param {String} what
 * @param {Object} options
 * @param {Function} callback
 * @api private
 */

builder.select = function() {
  var args = optimal(arguments, 's:table, s:what, o:options, f:callback');

  args.what = Array.isArray(args.what) ?
    args.what.join(',') :
    args.what ;

  client.query(
    'SELECT ' + args.what + ' FROM ' + args.table, args.callback
  );
};

/**
 * Inserts row into the database
 *
 * Examples:
 *
 *    builder.insert('table', { key: 'value' }, function(e, res) { ... });
 *
 * @param {String} table
 * @param {Object} values
 * @param {Function} callback
 * @api private
 */

builder.insert = function(table, values, callback) {
  var query = parameterize(values);

  client.query(
    'INSERT INTO ' + table +
    ' (' + keys[0] + ') VALUES (' +
    keys[1] + ')', keys[2], callback
  );
};

/**
 * Updates row in the database
 *
 * Examples:
 *
 *    builder.update('table', { key: 'value' }, function(e, res) { ... });
 *
 * @param {String} table
 * @param {Object} values
 * @param {Function} callback
 * @api private
 */

builder.update = function(table, values, callback) {
  var counter = 1,
      vals    = [];
  
  var keys = Object.keys(values).map(function(k) {
    vals.push(values[k]);
    return k + ' = $' + (++i);
  }).join(',');

  client.query(
    'UPDATE ' + table + ' SET ' + keys,
    vals, callback
  );

};

/**
 * Prepares `pg`'s parameterized query
 *
 * Examples:
 *    
 *    parameterize({ key: 'value', key2: 'value2');
 *    // => ['key, key2', '$1,$2,$3', ['value', 'value2']]
 *
 * @param {Object} object
 * @api private
*/

function parameterize(obj) {
  var keys = Object.keys(obj),
      val  = [],
      i    = 1;

  var objs = keys.map(function(x) {
    val.push('$' + i++);
    return obj[k];
  });

  return [
    keys.join(','),
    val.join(','),
    objs
  ];
}
