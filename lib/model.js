var Emitter    = require('eventemitter2').EventEmitter2,
    inflection = require('inflection'),
    utile      = require('utile'),
    model      = exports, hater, Query;

/**
 * Errors
 */

var ERR_NO_INSTANCE = "Method must be called on an instance";
var ERR_INSTANCE    = "Method cannot be called on an instance";

/**
 * Factory's prototype
 */

var factoryPrototype = {};

/**
 * Overrides Object.toJSON
 * 
 * Examples:
 *
 *    JSON.stringify(instance);
 *
 * @api private
 */

factoryPrototype.toJSON = function() {
  if(this.name === 'Factory') 
    throw new Error(ERR_NO_INSTANCE);

  return JSON.stringify(this._properties);
};

/**
 * Find models matching clause
 * 
 * Examples:
 *
 *    Model.find({ id: 1 }, function(err, instances) { ... }
 *
 * @param {Object} condition
 * @param {Function} callback
 * @api public
 */

factoryPrototype.find = function(what, where, fn) {
  var self  = this,
      query = new Query().select(this._table, what),
      em = new Emitter();

  if (typeof where === 'function') {
    fn = where;
    where = null;
  }

  if (where)
    query.where(where);

  query.exec(function(e, v) {
    if (v)
      v = v.map(function(x) {
        return new (self)(x);
      });

    if (fn)
      return fn(e, v);

    return !e ?
      em.emit('success', v) :
      em.emit('error', e);
  
  });
};

/**
 * Updates models matching clause
 *
 * Examples:
 *
 *    Model.update({ name: 'updated' }, { id: 1 }, function(e, instances) { ... }
 *
 * @param {Object} updated
 * @param {Object} clause
 * @param {Function} callback
 * @api public
 */

factoryPrototype.update = function(obj, w, fn) {
  var self = this;

  var em = new Emitter();

  new Query()
    .update(this._table, obj)
    .where(w)
    .exec(function(e, v) {
      if(fn) {
        fn(e, new (self)(v));
      }

      return !e ?
        em.emit('success', new (self)(v)) :
        em.emit('error', e);
    });

  return em;
};

/**
 * Deletes model from the database
 *
 * Examples:
 *
 *    Model.destroy(function(e) { ... });
 * 
 * @param {Function} callback
 * @api public
 */

factoryPrototype.destroy = function(w, fn) {
  var self = this;

  var em = new Emitter();
  
  if (typeof w == 'function') {
    if (!this._properties)
      throw new Error(ERR_NO_INSTANCE);
    
    fn = w;
    w = null;
  }

  w = w || this._properties;

  new Query()
    .delete(this._table)
    .where(w)
    .exec(function(e) {
      if(fn) {
        fn(e);
      }

      return !e ?
        em.emit('success') :
        em.emit('error', e);
    });

  return em;
};

/**
 * Creates and saves new Instance
 *
 * Examples:
 *
 *    Model.create({field: 'value'}, function(e, instance) { ... });
 *
 * @param {Object} values
 * @param {Function} callback
 * @api public
 */

factoryPrototype.create = function(obj, fn) {
  var self = this;

  var em = new Emitter();

  var instance = new(this)(obj);
  instance.save(function(e, res) {
    if(fn) {
      fn(e, res);
    }

    return !e ?
      em.emit('success', res) :
      em.emit('error', e) ;
  });

  return em;
};

/**
 * Saves model
 *
 * Examples:
 *
 *    Model.save(function(e, m) { ... });
 *
 * @param {Function} callback
 * @api public
 */

factoryPrototype.save = function(fn) {
  var self = this, query;

  var em = new Emitter();

  query = new Query();
  
  if (this.get('id')) {
    query.update(this._table, this._properties).where({id: this.get('id')});
  } else {
    query.insert(this._table, this._properties);
  }
  
  query.exec(function(e, v) {
    v = v.shift();
    if(v.id)
      self.set('id', v.id);

    if(fn) {
      return fn(e, self);
    }

    return !e ?
      em.emit('success', self) :
      em.emit('error', e);
  });

  return em;
};

// DOX

factoryPrototype.schema = function(obj) {
  if (this.name !== 'Factory')
    throw new Error(ERR_INSTANCE);
  
  this._schema = obj;
};

// DOX

factoryPrototype.sync = function() {
  var em = new Emitter(), self = this;
  
  if (!this._schema)
    throw new Error('There must be a schema');


  new Query()
    .createTable(this._table, this._schema)
    .exec(function(e, r) {
      !e ? 
        em.emit('success') :
        em.emit('error', e);
    });

  return em;
};

/**
 * Gets property value
 *
 * Examples:
 *
 *    Model.get('key');
 * 
 * @param {String} key
 * @api public
 */

factoryPrototype.get = function(key) {
  if(this.name === 'Factory')
    throw new Error(ERR_NO_INSTANCE);

  return this._properties[key];
};

/**
 * Sets property value
 *
 * Examples:
 *
 *    Model.set('key', 'value');
 *
 * @param {String} key
 * @param {String} value
 * @api public
 */

factoryPrototype.set = function(key, value) {
 if(this.name === 'Factory') 
   throw new Error(ERR_NO_INSTANCE);

 return this._properties[key] = value;
};

/**
 * Creates new Model
 *
 * Examples:
 *
 *    hater.extend('table', { extended: function() { return this.find(...) } });
 *
 * @param {String} table
 * @param {Object} extend
 * @api public
 */

model.extend = function(table, proto) {

  hater = require('./hater');
  Query = hater.builder.Query;

  factoryPrototype = utile.mixin(factoryPrototype, proto || {});
   
  function Factory(props) {
    var self = this;
    
    Object.defineProperty(this, '_name', {
      enumerable: false,
      value     : table
    });


    Object.defineProperty(this, '_table', {
      value     : inflection.pluralize(table),
      enumerable: false
    });
   
    Object.defineProperty(this, '_properties', {
      value     : props || {},
      writable  : true,
      enumerable: false
    });
    
    Object.defineProperty(this, '_schema', {
      writable: true,
      enumerable: false
    });

  }

  Factory._relationships = {};
  Factory._name = table;

  Factory.prototype = utile.mixin(factoryPrototype, require('./relationships'));
  Factory.prototype.__proto__ = new Emitter();

  Factory.__proto__ = factoryPrototype;
  Factory._table = inflection.pluralize(table);
   
  return hater[table] = Factory;
};
