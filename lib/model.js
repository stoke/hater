var Emitter = require('eventemitter2').EventEmitter2,
    utile   = require('utile'),
    Query   = require('./hater').builder.Query,
    model   = exports;

/**
 * Errors
 */

const ERR_NO_INSTANCE = "Method must be called on an instance";
const ERR_INSTANCE    = "Method cannot be called on an instance";

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

factoryPrototype.find = function() {

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

factoryPrototype.update = function() {

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

factoryPrototype.destroy = function() {

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

  if(this.constructor.name !== 'Factory')
    throw new Error(ERR_INSTANCE);

  var em = new Emitter();

  new Query()
    .insert(this._table, obj)
    .exec(function(e, v) {
      if(fn) {
        fn(e, new (self.constructor)(v));
      }

      return !e ?
        em.emit('success', new (self.constructor)(v)) :
        em.emit('error', e)   ;
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
  if(this.constructor.name === 'Factory')
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
 if(this.constructor.name === 'Factory') 
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

  factoryPrototype = utile.mixin(factoryPrototype, proto);

  function Factory(props) {
    var self = this;

    Object.defineProperty(this, '_table', {
      value     : table,
      enumerable: false
    });
    Object.defineProperty(this, '_properties', {
      value     : props || {},
      writable  : true,
      enumerable: false
    });
  }

  Factory.prototype = factoryPrototype;
  Factory.prototype.__proto__ = new Emitter();

  Factory._table      = table;
  Factory.__proto__   = new Emitter();
  Factory.constructor = Factory;
  Factory._super      = Factory;
   
  utile.each(factoryPrototype, function(value, key) {
    Factory[key] = value;
  });

  return Factory;
};

