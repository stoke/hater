var mysql   = require('mysql'),
    Emitter = require('eventemitter2').EventEmitter2,
    optimal = require('optimal'),
    hater   = require('../hater'),
    syncG,
    builder = exports;

var verbose = false;

builder.connect = function(connStr) {
  this.client = new mysql.createConnection(connStr);
  this.client.connect();
};

function Query() {
  this.client    = builder.client;
  this.noSync    = false;
}

require('util').inherits(Query, Emitter);

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

Query.prototype._whereParse = function(w) {
  var query = 'WHERE ', self = this;

  Object.keys(w).forEach(function(x) {
    if (query !== 'WHERE ') query += ' and ';

    if (Array.isArray(w[x]) && w[x].length) { // {x: [1,2,3]} = 'x=1 or x=2 or x=3'
      query += '('+x + (w[x][0] instanceof RegExp ? " LIKE "+self.escape(w[x].shift().source) : "="+self.escape(w[x].shift()));

      w[x].forEach(function(i) {
        
        query +=  ' or ';
        query += x + (i instanceof RegExp ? " LIKE "+self.escape(i.source) : "="+self.escape(i));
      });

      query += ')';
    } else {
      query += '('+x + (w[x] instanceof RegExp ? " LIKE "+self.escape(w[x].source) : "="+self.escape(w[x]))+')';
    }
  });

  return query;
};

// DOX

Query.prototype._setParse = function(values) {
  var set = '', self = this;
    
  Object.keys(values).forEach(function(x) {
    set += x+"="+self.escape(values[x])+",";
  });

  return set.slice(0, -1);
};

/* 
 * Escape
 *
 * Examples:
 *
 *    builder.escape("da'ng\\er%ous_str'ing")
 * 
 * @param str  {String} string to be escaped
 * @param type {Mixin}  type
 * @api public
 *
 */

Query.prototype.escape = mysql.escape;

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
 * Creates table
 *
 * Examples:
 *
 *    builder.createTable('table', { id: 'serial' });
 *
 * @param {String} table
 * @param {Object} config
 * @api public
 */

Query.prototype.createTable = function(table, obj, callback) {
  this.query = "CREATE TABLE IF NOT EXISTS " + table + ' (';

  this.query += Object.keys(obj).map(function(k) {
    return k + ' ' + obj[k];
  }).join(',') + ')';

  if (callback)
    this.exec(callback);

  return this;
};

// DOX

Query.prototype.skip = function() {
  this.noSync = true;
  
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

// DOX

Query.prototype.delete = function(table, callback) {
  this.query = 'DELETE FROM '+table;
  
  if (callback)
    return this.exec(callback);

  return this;
}

//DOX

Query.prototype.update = function(table, obj, callback) {
  this.query = 'UPDATE '+table+' SET '+this._setParse(obj);
  
  if (callback)
    return this.exec(callback);

  return this;
};

/*
 * SQL Insert
 *
 * Examples:
 *
 *    builder.insert('users', {username: 'test'}, [callback])
 * 
 * @param {String}   table
 * @param {Object}   values
 * @param {Function} callback
 * @api public
 */


Query.prototype.insert = function(table, values, callback) {
  var query = 'INSERT INTO '+table, self = this, set;

  if (Array.isArray(values)) {
    values = values.map(function(x) {
      return self.escape(x);
    });

    query += ' VALUES ('+values.join(',')+')';
  } else {
    query += ' SET '+this._setParse(values);
  }

  this.query = query;
 

  if (callback)
    return this.exec(callback);
  
  return this;
};

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

Query.prototype.select = function(table, what, callback) {
  what = Array.isArray(what) ?
    what.join(',') :
    what;

  this.query = 'SELECT ' + what + ' FROM ' + table;

  if (!callback) {
    return this;
  }

  this.exec(callback); 
};

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

Query.prototype.where = function(w) {
  this.query += ' '+this._whereParse(w);
  return this;
};

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

Query.prototype.exec = function(callback) {
  var self = this;
  if (!hater.synced) {
    if(!this.noSync) {
      hater._queue.push({ query: this, callback: callback });
      if(!syncG) {
        syncG = true;
        hater.sync();
      }
      return;
    }
  }

  if (!this.query)
    return;
  
  if (this.limitq)
    this.query += ' '+this.limitq;

  if(this.order_by)
    this.query += this.order_by;

  if (verbose)
    console.log(this.query);
  
  this.client.query(this.query, function(err, rows, fields) { // excluding fields to be even more agnostic :D
    if (!fields && rows && typeof rows.insertId === 'number')  // INSERT
      rows = [{id: rows.insertId}];
    
    if (callback)
      callback(err, rows)
    else
      err ? 
        self.emit('error', err) : 
        self.emit('success', rows);
  });

  delete this.query;
  delete this.limitq;
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
  this.limitq = 'LIMIT '+ (x || 1) + (y ? ', '+y : '');
  return this;
};

builder.Query = Query;
builder.name  = 'mysql';
