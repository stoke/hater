var Emitter = require('eventemitter2').EventEmitter2,
    utile   = require('utile');
    model   = exports;


/**
 * Model prototype (inherits from EE2)
 *
 * Examples:
 *
 *    new Model();
 */

function Model() {}

utile.inherits(Model, Emitter);

/**
 * Overrides Object.toJSON
 * 
 * Examples:
 *
 *    JSON.stringify(instance);
 *
 * @api private
 */

Model.prototype.toJSON = function() {
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

Model.prototype.find = function() {

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

Model.prototype.update = function() {

};

/**
 *
 *
 */

Model.prototype.destroy = function() {

};

Model.prototype.create = function() {

};

Model.prototype.get = function(key) {
  return this._properties[key];
};

Model.prototype.set = function(key, value) {
 return this._properties[key] = value;
};

model.extend = function(table, proto) {
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

    utile.each(proto, function(value, key) {
      self[key] = value;
    });
  }


  Factory.prototype = Model.prototype;
  Factory.prototype.__proto__ = new Emitter();

  Factory._table      = table;
  Factory.__proto__   = new Emitter();
  Factory.constructor = Factory;
   
  utile.each(Model.prototype, function(value, key) {
    Factory[key] = value;
  });

  return Factory;
};

