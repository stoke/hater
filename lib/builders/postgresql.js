var pg      = require('pg').native,
    Emitter = require('eventemitter2').EventEmitter2,
    hater   = require('../hater'),
    syncG,
    builder = module.exports = {};


var verbose = false;

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
  /*var string = require('url').parse(connStr),
      white  = ['host', 'database', 'password', 'port', 'user'],
      config = {};
  if(string.protocol === 'https:') config.ssl = true;

  if(string.hostname) config.host = string.hostname;
  if(string.port) config.port = string.port;
  if(string.pathname) config.database = string.pathname.slice(1);
  if(string.auth) {
    var split = string.auth.split(':');
    if(split[0])
      config.username = split[0];
    if(split[1])
      config.password = split[1];
  }*/
  
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
  * Sets orderBy clause
  *
  * Examples:
  *
  *    query.orderBy({ row: 'DESC' });
  *
  * @param {String} fields
  * @api public
  */
 
 Query.prototype.orderBy = function(fields) {
   this.order_by = ' ORDER BY ';
   this.order_by += Object.keys(fields).map(function(k) {
     return k + ' ' + fields[k];
   }).join(',');
     
  return this;
};  

/**
 * Joins tables
 *
 * @param {String} table
 * @param {Object} on
 * @api public
 */

Query.prototype.join = function(table, on) {
  var clause = Object.keys(on).map(function(key) {
    return key + ' = ' + on[key];
  }).join(' AND ');

  this.query += ' INNER JOIN ' + table + ' ON ' + clause;
  
  return this;
};


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
  
  this.query += 'VALUES (' + a.join(',') +  ')';
  this._args = this._args.concat(objectValues(values));

  return this;
};

// DOX

Query.prototype.skip = function() {
  this.noSync = true;

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
 * SQL Limit
 * 
 * Examples:
 *    
 *    builder.select('name', '*').limit(0).exec(function(e, rows) { ... });
 * 
 * @param {Int} x
 * @param {Int} y
 * @api public
 */

Query.prototype.limit = function(x, y) {
  this.limitq = 'LIMIT '+ (x || 1) + (y ? ','+y : '');
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
  
  if (!hater.synced) {
    if(!this.noSync) {
      hater._queue.push({ query: this, callback: fn });
      if(!syncG) {
        syncG = true;
        hater.sync();
      }
      return;
    }
  }
  
  if(~this.query.search(/INSERT|UPDATE/)) {
    this.query += ' RETURNING id';
  }
  
  if (this.limitq)
    this.query += ' '+this.limitq;

  if(this.order_by)
    this.query += this.order_by;

  if (verbose)
    console.log(this.query);
  
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
};

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

/** Single key parser
 *
 * Examples:
 *    singleKey('asd', 'derp');
 * 
 * @param {String} key
 * @param {String} value
 * @api private
 */

function singleKey(key, value) {
  var query = key + ' ';
  if(value instanceof RegExp) {
    query += 'LIKE ($' + (this._counter++) + ') ';
    this._args.push(value.source);
  }
  else {
    query += '= $' + (this._counter++) + ' ';
    this._args.push(value);
  }
  return query;
}

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

function whereParser(clause) {
  var self  = this,
      query = ' WHERE ';

  Object.keys(clause).forEach(function(key) {
    var value = clause[key];
    if(Array.isArray(value)) {
      query += '(';
      value.forEach(function(v) {
        query += singleKey.call(self, key, v) + ' OR ';      
      }); 
      query = query.substring(0, query.length - 5);
      query += ')';
    }
    else {
      query += singleKey.call(self, key, value);
    }
    
    query += ' AND ';
  });
  
  return query.substring(0, query.length - 6);
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

builder.name = 'postgres';
