var hater         = require('./hater'),
    inflection    = require('inflection'),
    Emitter       = require('eventemitter2').EventEmitter2,
    Types         = require('./types').types,
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
      self = this,
      cap  = inflection.capitalize(name),
      em   = new Emitter();


  var table = {
    id: Types.Serial()
  };
  table[name + 'Id'] = Types.Integer;
  table[par  + 'Id'] = Types.Integer;

  new (hater.builder.Query)()
    .createTable(table)
    .exec(function(e) {
      if(e) em.emit('error', e);
    });

  this._relationships.hasMany.push(name);

  hater._models[par].prototype['create' + cap] = function(attrs, callback) {
    var em = new Emitter();

    attrs[par + 'Id'] = this.get('id');
    new (Model)(attrs).save(function(e, instance) {
      if(e) {
        return em.emit('error', e);
      } 
      em.emit('success', instance);

      if(callback) callback(e, instance);
    });

    return em;
  };

  Model.prototype['create' + inflection.capitalize(par)] = function(attrs, callback) {
    var em = new Emitter();

    attrs[this._name + 'Id'] = this.get('id');

    new (self)(attrs).save(function(e, instance) {
      if(e) {
        return em.emit('error', e);
      } 
      em.emit('success', instance);

      if(callback) callback(e, instance);
    });

    return em; 
  };

  return em;
};
