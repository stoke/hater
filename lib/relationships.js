var hater         = require('./hater'),
    inflection    = require('inflection'),
    relationships = module.exports;

/**
 * Defines one way relationships
 *
 * Examples:
 *    Model.hasOne(Model2);
 *
 * @param {Function} model
 * @api public
 */

relationships.hasOne = function(Model) {
  var name = Model._name,
      par  = this._name,
      cap  = inflection.capitalize(name);

  this._relationships.hasOne.push(name);

  hater._models[par].prototype['create' + cap] = function(attrs, callback) {
    var Child = hater._models[name];

    attrs[par + 'Id'] = this.get('id');

    Child.create(attrs, callback);
  };

  return this;
};

/**
 * Defines many to many relationships
 * 
 * Examples:
 *
 *    Model.hasMany(Model2);
 *
 * @param {Function} model
 * @api public
 */

relationships.hasMany = function(Model) {
  var name = Model._name,
      par  = this._name,
      cap  = inflection.capitalize(name);

  this._relationships.hasMany.push(name);

  hater._models[par].prototype['create' + cap] = function(attrs, callback) {
    
  };

  Model.prototype['create' + inflection.capitalize(par)] = function(attrs, callback) {
    
  };
};
