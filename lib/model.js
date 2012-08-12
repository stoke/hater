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

  if (options.where) {
    var own = utile.filter(options.where, function(v, k) { return typeof v !== 'object'; });
    if(Object.keys(own).length)
      query.where(own);
  }
  
  query.exec(function(e, v) {
    var todo = v && v.length;
    em.on('done', function(e) {
      if(!(--todo) || !options.fetch) {
        if(e) { return em.emit('error', e); }
         
        em.emit('success', v);
        if(fn) { fn(e, v); }
      }
    });

    if (v) {
      v = v.map(function(x) {
        var instance = new (self)(x);

        if(options.fetch) {
          self.fetch.call(instance, options, em, e);
        }
        
        return instance;
      });
    }
    
    if(!options.fetch)
      em.emit('done', e, v); 
  });

  return em;
};

// DOX

factoryPrototype.findOrCreate = function(obj, cbl) {
  var self = this;

  this.find({where: obj}, function(e, r) {
    if (!e && r.length)
      return cbl(e, r);

    self.create(obj, function(e) {
      if (e)
        return cbl(e);

      self.find({where: obj}, cbl);
    });
  })
}

// DOX

factoryPrototype.findOne = function(obj, cbl) {
  var self = this;

  this.find(obj, function(e, r) {
    if (e)
      return cbl(e);

    cbl(e, r.shift() || null);
  });
}

/**
 * Wrapper around fetch that works with instances
 *
 * Examples:
 *
 *    Instance.load({fetch: ["child"]}, function() { ... });
 *
 * @param {Object} specs
 * @param {Function} callback
 * @api public
 */

factoryPrototype.load = function(what, callback) {
  var emitter = new Emitter();
  emitter.on('done', function() {
    callback();
  });

  this.fetch(what, emitter, null);
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

factoryPrototype.fetch = function(options, emitter, e) {
  var children = options.fetch,
      todo     = children.length,
      em       = new Emitter(),
      instance = this;

  em.on('done', function(err) {
    if(!(--todo)) {
      emitter.emit('done', e || err, instance);
    }
  });
  
  children.forEach(function(elem) {
    var rest      = elem.split('.'),
        childName = rest.shift(),
        Child     = hater._models[childName],
        clause    = { where: {} };

    if(
      hater._relationships.oneToOne[instance._name] ||
      hater._relationships.manyToMany[instance._name]
    ) {

      var oneToOne   = hater._relationships.oneToOne[instance._name],
          manyToMany = hater._relationships.manyToMany[instance._name];

      if(oneToOne && ~oneToOne.indexOf(childName)) {
        if(rest.length) {
          clause.fetch = rest.join('.');
        }
        clause.where[instance._name + '_id'] = instance.get('id');
        Child.find(clause, function(e, children) {
          instance.set(childName, children.shift());
          em.emit('done');
        });
      } 
    
      if(manyToMany && ~manyToMany.indexOf(childName)) {
        var Table = 
          hater._models[Child._name + inflection.capitalize(instance._name)] ||
          hater._models[instance._name + inflection.capitalize(Child._name)] ;

        if(rest.length) {
          clause.fetch = rest.join('.');
        }
      
        var join = {};
        join['second.' + instance._name + '_id'] = instance.get('id');
        new Query()
          .select(inflection.pluralize(Child._name), '*')
          .join(inflection.pluralize(Table._name), join)
          .exec(function(e, res) {
            var ee   = new Emitter(),
                todo = res && res.length,
                many = [];

            ee.on('done', function() {
              if(!(--todo)) {
                instance.set(inflection.pluralize(Child._name), many);
                em.emit('done');
              }
            });
             
            res.map(function(row) {
              clause.where = utile.mixin({ id: row[Child._name + '_id'] }, (options.where || {})[inflection.pluralize(Child._name)] || {});
              Child.find(clause, function(e, res) {
                var v = res.shift();
                if(v)
                  many.push(v);
                ee.emit('done');
              });
            });
          });
       
      }
    }
    else {
      em.emit('done');
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
 * @param {Boolean} skip
 * @param {Function} callback
 * @api public
 */

factoryPrototype.save = function(/* [skip], fn*/) {
  var self  = this, 
      em    = new Emitter(),
      query = new Query(),
      args  = [].slice.call(arguments, 0);

  var fn   = args.pop(),
      skip = args.pop();

  var fields = utile.filter(this._properties, function(v, k) {
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
    function done(err) {
      if(fn) {
        return fn(e || err, self);
      }

      return (e || err) ?
        em.emit('error', e || err)  :
        em.emit('success', self);
    }
    return !skip ?
      utile.async.series([
        syncOneToOne.bind(self),
        syncManyToMany.bind(self)
      ], done) :
      done()   ;
      
  });
   
  return em;
};


/**
 * Syncs one to one with the model
 * 
 * Examples:
 *
 *    syncOnetoOne.call(Instance, function() { ... });
 *
 * @param {Function} callback
 * @api private
 */

function syncOneToOne(done) {
  var self = this,
      rels = hater._relationships.oneToOne[this._name];
  
  if(rels && rels.length) {

    (function iterator(keys) {
      var childName = keys.shift();
      if(!childName) { return done(null); }

      var child = self.get(childName);
      if(child) {
        child.set(self._name + '_id', self.get('id'));
        child.save(function(e) {
          if(e)
            return done(e);
         
          self.set(child._name + '_id', child.get('id'));
          self.save(true, function(e) {
            self.set(childName, child);
            iterator(keys);
          });
        });
      }
      else {
        iterator(keys);
      }
    })(rels.slice(0));
  } else {
    done(null);
  } 
}

/**
 * Saves many to many relations
 *
 * Examples
 *
 *    syncManyToMany.call(instance, function() { ... });
 *
 * @param {Function} callback
 * @api private
 */

function syncManyToMany(done) {
  var self = this,
      rels = hater._relationships.manyToMany[this._name];

  if(rels && rels.length) {
    var todo = rels.length,
        em   = new Emitter();
    
    em.on('done', function() {
      if(!(--todo)) {
        done(null);
      }
    });
    em.on('error', function() {
      done(e);
    });

    (function iterator(keys) {
      var childName = keys.shift(),
          children  = self.get(inflection.pluralize(childName));
      
      if(children && children.length) {
        var emitter = new Emitter(),
            todo    = children.length;

        emitter.on('done', function() {
          if(!(--todo)) {
            em.emit('done');  
          }
        });

        children.forEach(function(child) {
          var Table = 
            hater._models[child._name + inflection.capitalize(self._name)] ||
            hater._models[self._name + inflection.capitalize(child._name)] ;
          
          var link = {};
          link[self._name + '_id'] = self.get('id');

          function setTable(link) {
            
            Table.find({ where: link }, function(e, res) {
              if(e) em.emit('error', e);

              if(!res.length) {
                Table.create(link, function(e) {
                  return e ?
                  em.emit('error', e) :
                  emitter.emit('done');
                });
              } else {
                emitter.emit('done');
              }
            });

          }

          if(child.get('id')) {
            link[child._name + '_id'] = child.get('id');
            setTable(link);
          }
          else {
            child.save(function(e) {
              if(e) em.emit('error', e);

              link[child._name + '_id'] = child.get('id');
              setTable(link);
            });
          } 
        }); 
      } else {
        em.emit('done');
      }
        

    })(rels.slice(0));

  } else {
    done(null);
  }
}

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
