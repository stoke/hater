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

  var keys = Object.keys(values),
      val  = [],
      i=1;

  var objs = keys.forEach(function(k) {
    val.push('$' + i++);
    return values[k];
  }).join(',');

  client.query(
    'INSERT INTO ' + table +
    '(' + keys.join(',') + ') VALUES (' +
    objs + ')', callback
  );
};
