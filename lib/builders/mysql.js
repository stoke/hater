var mysql   = require('mysql'),
    optimal = require('optimal'),
    builder = exports;

/*
 * Connects to database
 *
 * Examples:
 *
 *    builder.connect('mysql://root:1234@localhost/mysql');
 *
 * @param {String} conn
 * @api private
 */

builder.connect = function(connStr) {
  this.client = new mysql.createConnection(connStr);
  this.client.connect();
};

/* 
 * Escape
 *
 * Examples:
 *
 *    builder.escape("da'ng\\er%ous_str'ing")
 * 
 * @param str  {String} string to be escaped
 * @param type {Mixin}  string type
 * @api public
 *
 */

builder.escape = function() {
  return this.client.escape.apply(this.client, arguments);
};

/* 
 * Build wheres
 *
 * Examples:
 *
 *    builder._whereParse({x: 1, y:[1,2,3]})
 * 
 * @param where {String} object to be parsed
 * @api private
 *
 */

builder._whereParse = function(w) {
  var query = 'WHERE ', self = this;

  Object.keys(w).forEach(function(x) {
    if (query !== 'WHERE ') query += ' and ';

    if (Array.isArray(w[x])) { // {x: [1,2,3]} = 'x=1 or x=2 or x=3'
      query += '('+x+'='+self.escape(w[x].shift())+' or '+x+'=';

      w[x] = w[x].map(function(i) {
        return self.escape(i);
      });
      
      query += w[x].join(' or '+x+'=') + ')';
    } else {
      query += '('+x+'='+self.escape(w[x])+')';
    }
  });

  return query;
}

/**
 * Object-based 'WHERE' clause 
 * 
 * Examples:
 *    
 *    builder.find('Users', '*')
 *      .where({id: 2})
 *      .exec(function(e, rows) { ... });
 * 
 * @param {Object} where
 * @api public
 */

builder.where = function(w) {
  this.query += ' '+this._whereParse(w);
  return this;
}

/**
 * Execute query
 * 
 * Examples:
 *    
 *    builder.find('Users', '*')
 *      .where({id: 2})
 *      .exec(function(e, rows) { ... });
 * 
 * @param {Function} callback
 * @api public
 */


builder.exec = function(callback) {
  return this.client.query(this.query, function(err, rows, fields) { // excluding fields to be even more agnostic :D
    if (err)
      return callback(err);

    callback(err, rows);
  });
}


/**
 * Selects row from the database
 * 
 * Examples:
 *    
 *    builder.select('name', '*', function(e, rows) { ... });
 * 
 * @param {String} table
 * @param {String} what
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

builder.select = function(table, what, callback) {
  what = Array.isArray(what) ?
    what.join(',') :
    what;

  this.query = 'SELECT ' + what + ' FROM ' + table;

  if (!callback) {
    return this;
  }

  this.exec(callback); 
};

