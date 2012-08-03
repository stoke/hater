var pg      = require('pg'),
    builder = module.exports = {};

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
  this.query = '';
  this._counter = 1;
  this._args = [];
  return this;
};

/**
 * Selects row from the database
 * 
 * Examples:
 *    
 *    builder.select('name', '*');
 * 
 * @param {String} table
 * @param {String} what
 * @api private
 */

builder.select = function(table, what) {

  this.query = 'SELECT ';

  what = Array.isArray(what) ?
    what.join(',') :
    what ;

  this.query += what + ' FROM ' + table;

  return this;
};

/**
 * Inserts row into the database
 *
 * Examples:
 *
 *    builder.insert('table', { key: 'value' });
 *
 * @param {String} table
 * @api private
 */

builder.insert = function(table, values) {
  this.query = 'INSERT INTO ' + table;

  var l = Object.keys(values).length,
      a = [],
      i = 1;

  this.query += ' (' + Object.keys(values).join(',') + ') ';
  do {
    a.push('$'+ (this._counter++));
  } while(--l);
  
  this.query += 'VALUES (' + a.join(',') +  ')';
  this._args = this._args.concat(objectValues(values));

  return this;
};


/**
 * Updates row in the database
 *
 * Examples:
 *
 *    builder.update('table');
 *
 * @param {String} table
 * @api private
 */

builder.update = function(table) {
  this.query = 'UPDATE ' + table + 'SET';
  
  var keys = Object.keys(obj),
      arr  = [],
      self = this;

  this.query += 'SET ';
  
  this.query += keys.map(function(k) {
    arr.push(obj[k]);
    return k + '=' + '$' + (self._counter++);
  }).join(',');

  this._args = arr;

  return this;
};

/**
 * Deletes row in the database
 *
 * Examples:
 *
 *    builder.delete('table');
 *
 * @param {String} table
 * @api private
 */

builder.delete = function(table) {
  this.query = 'DELETE FROM ' + table;

  return this;
};

/**
 * Runs the query
 *
 * Examples:
 *
 *    builder.exec(function(e, res) { ... });
 *
 * @param {Function} callback
 * @api private
 */

builder.exec = function(fn) {
  var cbl = function(e, res) {
    fn(e, res && res.rows);
  };
  
 if(this._args) {
   client.query(this.query, this._args, cbl);
 } else {
   client.query(this.query, this._args, cbl);
 }
 
 console.log(this._args);
 console.log(this.query);
 this._args = [];
 this._counter = 1;

 return this;
};

/**
 * Where clause
 * 
 * Examples:
 *    
 *    builder.where({ id: 1 });
 *
 * @param {Object} obj
 * @api private
 */

builder.where = function(obj) {
  this.query += whereParser.call(this, obj);

  return this;
};

/**
 * Where parser
 *
 * Examples:
 *
 *    whereParser({id: '1'});
 *
 * @param {Object} obj
 * @api private
 */

function whereParser(w) {
  var query  = ' WHERE ',
      self   = this; 

  Object.keys(w).forEach(function(x) {
    if (query !== ' WHERE ') query += ' and ';

    if (Array.isArray(w[x])) { // {x: [1,2,3]} = 'x=1 or x=2 or x=3'
      self._args.push(w[x].shift());
      query += '('+ x +'=$'+ self._counter++  +' or '+ x +'=';
      w[x] = w[x].map(function(i) {
        self._args.push(i);
        return '$' + (self._counter++);
      });
                                                  
      query += w[x].join(' or '+ x +'=') + ')';
    } else {
      self._args.push(w[x]);
      query += '('+ x +'=$'+ (self._counter++) +')';
    }
  });
  return query;
}

/**
 * Returns object values
 *
 * Examples:
 *
 *    objectValues({key: 'values'});
 *
 * @param {Object} obj
 * @api private
 */

function objectValues(obj) {
  return Object.keys(obj).map(function(k) {
    return obj[k];
  });
}
