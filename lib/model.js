var Emitter = require('eventemitter2').EventEmitter2,
    model   = exports;


/**
 * Model prototype (inherits from EE2)
 *
 * Examples:
 *
 *    new Model();
 *
 */

function Model() {}

require('util').inherits(Model, Emitter);

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
 * Find models matching description
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

Model.prototype.update = function() {

};

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
    this.__proto__ = proto;

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
  
  require('util').inherits(Factory, Model);

  return Factory;
};

