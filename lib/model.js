var Emitter    = require('eventemitter2').EventEmitter2,
    inflection = require('inflection'),
    utile      = require('utile'),
    types      = require('./types'),
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
 *    Model.find({ where: { id: 1 } }, function(err, instances) { ... }
 *
 * @param {Object} condition
 * @param {Function} callback
 * @api public
 */

factoryPrototype.find = function(options, fn) {
  var self  = this,
      query = new Query().select(this._table, '*'),
      em = new Emitter();

  em.on('done', function(e, v) { 
    if(e) {
      return em.emit('error', e);
    }

    em.emit('success', v);
    if(fn) {
      fn(e, v);
    } 
  });

  if (options.where)
    query.where(options.where);
  
  query.exec(function(e, v) {
    if (v) {
      v = v.map(function(x) {
        var instance = new (self)(x);
        
        if(options.fetch) {
          self.fetch.call(instance, options.fetch, em, e, v);
        }

        return instance;
      });
    }
     
    if(!options.fetch)
      em.emit('done', e, v); 
  });

  return em;
};

/**
 * Fetches relationships
 *
 * Examples:
 *
 *    Model.fetch();
 *
 * @param {Array}  children
 * @param {Object} emitter
 * @param {Object} e
 * @param {Array}  value
 * @api private
 */

factoryPrototype.fetch = function(children, emitter, e, v) {
  var todo     = children.length,
      instance = this;

  function done() {
    emitter.emit('done', e, v);
  }

  children.forEach(function(elem) {
    var rest      = elem.split('.'),
        childName = inflection.singularize(rest.shift()),
        Child     = hater._models[childName],
        clause    = { where: {} };

    if(~hater._relationships.oneToOne[instance._name].indexOf(childName)) {
      if(rest.length) {
        clause.fetch = rest;
      }
      clause.where[instance._name + '_id'] = instance.get('id');
      
      Child.find(clause, function(e, children) {
        instance.set(inflection.pluralize(childName), children);
        done();
      }); 
    } else {
      done();
    }
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
  var self = this, query, fields;

  var em = new Emitter();

  query = new Query();

  fields = utile.filter(this._properties, function(v, k) {
    return typeof v !== 'object';
  });

  if (this.get('id')) {
    query.update(this._table, fields).where({id: this.get('id')});
  } else {
    query.insert(this._table, fields);
  }
  
  query.exec(function(e, v) {
    if(v) {
      v = v.shift();
      if(v.id)
        self.set('id', v.id);
    }

    if(fn) {
      return fn(e, self);
    }

    return !e ?
      em.emit('success', self) :
      em.emit('error', e);
  });

  return em;
};

/**
 * Create schema
 *
 * Examples:
 *
 *    Model.schema({id: hater.Types.Serial(), user: hater.Types.String({lentgh: 32})});
 *
 * @param {Object} Table
 * @api public
 */

factoryPrototype.schema = function(obj) {
  if (this.name !== 'Factory')
    throw new Error(ERR_INSTANCE);
  
  this._schema = obj;

  return this;
};

/**
 * Add properties to schema
 *
 * Examples:
 *
 *    Model.addProperties({password: hater.Types.String({length: 32}), valid: hater.Types.Boolean()})
 *
 * @param {Object} Properties
 * @api public
 */

factoryPrototype.addProperties = function(obj) {
  if (!this._schema)
    this._schema = {};

  this._schema = utile.mixin(this._schema, obj);
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

  Factory._name = table;

  Factory.prototype = utile.mixin(factoryPrototype, require('./relationships'));
  Factory.prototype.__proto__ = new Emitter();

  Factory.__proto__ = factoryPrototype;
  Factory._table = inflection.pluralize(table);
  
  return hater._models[table] = Factory;
};
