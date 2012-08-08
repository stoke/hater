var hater         = require('./hater'),
    inflection    = require('inflection'),
    relationships = module.exports;

/**
 * Relationships holder
 */

relationships.inject = {};


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

  hater._models[name].prototype['create' + cap] = function(attrs, callback) {
    var Child = hater._models[name];

    attrs[par + 'Id'] = this.get('id');

    Child.create(attrs, callback);
  };
};


