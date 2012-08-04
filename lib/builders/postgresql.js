var pg      = require('pg'),
    builder = module.exports = {
      _args   : [],
      _counter: 1,
      query   : ''
    };

/**
 * Connects to database
 *
 * Examples:
 *
 *    builder.connect('tcp://postgres:1234@localhost/postgres');
 *
 * @param {String} conn
 * @api public
 */

builder.connect = function(connStr) { 
  
  this.client = new pg.Client(connStr);
  this.client.connect();

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
 * @api public
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
 * @api public
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
 * @api public
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
 * @api public
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
 * @api public
 */

builder.exec = function(fn) {
  var cbl = function(e, res) {
    fn(e, res && res.rows);
  };
  if(this._args) {
    this.client.query(this.query, this._args, cbl);
  } else {
    this.client.query(this.query, cbl);
  }

  this._args = [];
  this._counter = 1;

  return this;
};

/**
 * Creates tabòe
 *
 * Examples:
 *
 *    builder.createTable('table', { id: 'serial' });
 *
 * @param {String} table
 * @param {Object} config
 * @api public
 */

builder.createTable = function(table, obj) {
  this.query = "CREATE TABLE IF NOT EXISTS " + table + ' (';

  this.query += Object.keys(obj).map(function(k) {
    return k + obj[k];
  }).join(',') + ')';
};

/**
 * Where clause
 * 
 * Examples:
 *    
 *    builder.where({ id: 1 });
 *
 * @param {Object} obj
 * @api public
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

    if (Array.isArray(w[x])) { 
      self._args.push(w[x].shift());
      query += '('+ x +' = $'+ self._counter++  +' or '+ x +' = ';
      w[x] = w[x].map(function(i) {
        self._args.push(i);
        return '$' + (self._counter++);
      });
                                                  
      query += w[x].join(' or '+ x +' = ') + ')';
    } else {
      self._args.push(w[x]);
      query += '('+ x +' = $'+ (self._counter++) +')';
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
