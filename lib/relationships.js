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
      cap  = inflection.capitalize(name),
      em   = new Emitter();

  this._relationships.hasOne.push(name);

  hater._models[par].prototype['create' + cap] = function(attrs, callback) {
    var Child = hater._models[name];

    attrs[par + 'Id'] = this.get('id');

    Child.create(attrs, callback);
  };

  this.prototype['get' + inflection.pluralize(cap)] = function(callback) {
    var finder = {};
    finder[par + 'Id'] = this.get('id');
    Model.find(finder, callback);
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
      cap  = inflection.capitalize(name);

  this._relationships.hasMany.push(name);

  hater._models[par].prototype['create' + cap] = function(attrs, callback) {
    var self = this,
        em   = new Emitter();
   
    new (Model)(attrs).save(function(e, instance) {
      var insert = {};
      insert[name + 'Id'] = instance.get('id'); 
      insert[cap  + 'Id'] = self.get('id');

      new (hater.builder.Query)()
        .insert(par + cap)
        .exec(function(err) {
          if(e || err) {
            if(callback) callback(e || err);

            return em.emit('error', e || err);
          }
          em.emit('success', instance);
          
          if(callback) callback(null, instance);
        });
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

  return this;
};
