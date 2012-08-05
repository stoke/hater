var Emitter = require('eventemitter2').EventEmitter2,
    utile   = require('utile');
    model   = exports;

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
 *
 *
 */

factoryPrototype.destroy = function() {

};

factoryPrototype.create = function() {

};

factoryPrototype.get = function(key) {
  return this._properties[key];
};

factoryPrototype.set = function(key, value) {
 return this._properties[key] = value;
};

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
   
  utile.each(factoryPrototype, function(value, key) {
    Factory[key] = value;
  });

  return Factory;
};

