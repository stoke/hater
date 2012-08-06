var pg      = require('pg'),
    Emitter = require('eventemitter2').EventEmitter2,
    builder = module.exports = {};

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
 * Query object
 *
 * Examples:
 *
 *    new builder.Query();
 *
 * @api public
 */

function Query() {
  this.client = builder.client;
  this.query    = '';
  this._counter = 1;
  this._args    = [];
}

/**
 * Query inherits from EventEmitter2
 */

require('util').inherits(Query, Emitter);

/**
 * Expose Query 
 */

builder.Query = Query;

/**
 * Selects row from the database
 * 
 * Examples:
 *    
 *    query.select('name', '*');
 * 
 * @param {String} table
 * @param {String} what
 * @api public
 */

Query.prototype.select = function(table, what) {

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
 *    query.insert('table', { key: 'value' });
 *
 * @param {String} table
 * @api public
 */

Query.prototype.insert = function(table, values) {
  this.query = 'INSERT INTO ' + table;

  var l = Object.keys(values).length,
      a = [],
      i = 1;

  this.query += ' (' + Object.keys(values).join(',') + ') ';
  do {
    a.push('$'+ (this._counter++));
  } while(--l);
  
  this.query += 'VALUES (' + a.join(',') +  ') RETURNING id';
  this._args = this._args.concat(objectValues(values));

  return this;
};


/**
 * Updates row in the database
 *
 * Examples:
 *
 *    query.update('table');
 *
 * @param {String} table
 * @param {Object} object
 * @api public
 */

Query.prototype.update = function(table, obj) {
  this.query = 'UPDATE ' + table + ' SET ';
  
  var keys = Object.keys(obj),
      arr  = [],
      self = this;
  
  this.query += keys.map(function(k) {
    arr.push(obj[k]);
    return k + '=' + '$' + (self._counter++);
  }).join(',');

  this.query += ' RETURNING id';
  this._args = arr;

  return this;
};

/**
 * Deletes row in the database
 *
 * Examples:
 *
 *    query.delete('table');
 *
 * @param {String} table
 * @api public
 */

Query.prototype.delete = function(table) {
  this.query = 'DELETE FROM ' + table;

  return this;
};

/**
 * Runs the query
 *
 * Examples:
 *
 *    query.exec(function(e, res) { ... });
 *
 * @param {Function} callback
 * @api public
 */

Query.prototype.exec = function(fn) {
  var self = this;
  var cbl = function(e, res) {
    if(fn) {
      fn(e, res && res.rows);
    } else {
      return !e ?
        self.emit('success', res.rows) :
        self.emit('error', e);
    }
  };

  if(this._args) {
    self.client.query(this.query, this._args, cbl);
  } else {
    self.client.query(this.query, cbl);
  }

  this._args = [];
  this._counter = 1;

  return this;
};

/**
 * Creates table
 *
 * Examples:
 *
 *    query.createTable('table', { id: 'serial' });
 *
 * @param {String} table
 * @param {Object} config
 * @api public
 */

Query.prototype.createTable = function(table, obj) {
  this.query = "CREATE TABLE IF NOT EXISTS " + table + ' (';

  this.query += Object.keys(obj).map(function(k) {
    return k + ' ' + obj[k];
  }).join(',') + ')';

  return this;
};

/**
 * Drops table
 *
 * Examples:
 *
 *    query.drop('table')
 *
 * @param {String} table
 * @api public
 */

Query.prototype.drop = function(table) {
  this.query = 'DROP TABLE IF EXISTS ' + table; 

  return this;
}

/**
 * Where clause
 * 
 * Examples:
 *    
 *    query.where({ id: 1 });
 *
 * @param {Object} obj
 * @api public
 */

Query.prototype.where = function(obj) {
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
