var Emitter     = require('eventemitter2').EventEmitter2,
    inflection  = require('inflection'),
    utile       = require('utile'),
    types       = require('./types'),
    revalidator = require('revalidator'),
    model       = exports, hater, Query;

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
  
  return this._properties;
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

  if(options.limit) {
    query.limit.apply(null, Array.isArray(options.limit) ?
      options.limit.map(function(v) { return parseInt(v, 10); }) :
      [parseInt(options.limit, 10)] );
  }

  query.exec(function(e, v) {
    var todo = v && v.length;
    em.on('done', function(e) {
      if(!(--todo) || !options.fetch) {
        if(e && em.listeners('error')) { return em.emit('error', e); }
         
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
    else {
      v = null;
    }
    
    if(!options.fetch || !v) 
      em.emit('done', e, v); 
  });

  return em;
};

/**
 * Find or creates document
 *
 * Examples:
 *
 *    Model.findOrCreate({ field: 'value' }, function(e, instance) { ... });
 *
 * @param {Object} values
 * @param {Function} callback
 * @api public
 */

factoryPrototype.findOrCreate = function(obj, cbl) {
  var self = this;

  this.findOne(obj, function(e, r) {
    if(e) return cbl(e);
    console.log(r);
    if (r)
      return cbl(null, r);

    self.create(obj.where, function(e, instance) {

      return !e ?
        cbl(null, instance) :
        cbl(e) ;
    });
  });
};

/**
 * FindOne instead of Find
 *
 * Examples:
 *
 *    Model.findOne({where: { id: 1} }, function(e, instance) { ... });
 *
 * @param {Object} clause
 * @param {Function} callback
 * @api public
 */

factoryPrototype.findOne = function(obj, cbl) {
  var self = this;

  this.find(obj, function(e, r) {
    if (e)
      return cbl(e);

    cbl(e, r.shift() || null);
  });
};

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
        clause    = { where: {} },
        Child;

    if(
      hater._relationships.oneToOne[instance._name]   ||
      hater._relationships.manyToMany[instance._name] ||
      hater._relationships.belongsTo[instance._name]  ||
      hater._relationships.hasMany[instance._name]
    ) {
      var oneToOne   = hater._relationships.oneToOne[instance._name],
          manyToMany = hater._relationships.manyToMany[instance._name],
          belongsTo  = hater._relationships.belongsTo[instance._name],
          hasMany    = hater._relationships.hasMany[instance._name];

      if(rest.length) {
        clause.rest = rest.join('.');
      }

      if(oneToOne && ~oneToOne.indexOf(childName)) {
        Child = hater._models[childName];

        clause.where[instance._name + '_id'] = instance.get('id');

        Child.find(clause, function(e, children) {
          instance.set(childName, children.shift());
          em.emit('done');
        });
      } 
    
      if(manyToMany && ~manyToMany.indexOf(inflection.singularize(childName))) {
        childName = inflection.singularize(childName);
        Child = hater._models[childName];
        var Table = 
          hater._models[Child._name + inflection.capitalize(instance._name)] ||
          hater._models[instance._name + inflection.capitalize(Child._name)] ;
      
        var join = {};
        join[inflection.pluralize(Table._name) + '.' + instance._name + '_id'] = instance.get('id');
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
            if(!res) {
              return ee.emit('done');
            } 
            
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
      
      if(hasMany && ~hasMany.indexOf(inflection.singularize(childName))) {
        Child = hater._models[inflection.singularize(childName)];
        clause.where[instance._name + '_id'] = instance.get('id');

        clause.where = utile.mixin(clause.where, (options.where || {})[childName] || {});

        Child.find(clause, function(e, children) {
          instance.set(childName, children);
          em.emit('done');
        });
      }

      if(belongsTo && ~belongsTo.indexOf(childName)) {
        Child = hater._models[childName];
        clause.where.id = instance.get(childName + '_id');

        Child.findOne(clause, function(e, parent) {
          instance.set(childName, parent);
          em.emit('done');
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
 *    Model.update({ name: 'updated' }, { where: { id: 1 } }, function(e, instances) { ... }
 *
 * @param {Object} updated
 * @param {Object} clause
 * @param {Function} callback
 * @api public
 */

factoryPrototype.update = function(/* obj, [clause], fn*/) {
  var self   = this,
      args   = Array.prototype.slice.call(arguments, 0),
      fn     = args.pop(),
      obj    = args.shift(),
      clause = args.shift();

  var em = new Emitter();

  if(clause) {
    var result = validateFields.call(self, obj);
    obj   = result.shift();
    var valid = result.shift();

    var done = function(e, v) {
      if(fn) {
        fn(e, v);
      }

      if(e && em.listeners('error')) em.emit('error', e);

      if(!e) em.emit('success', v);
    };
    
    if(!valid || (valid && valid.valid)) {
      new Query()
        .update(this._table, obj)
        .where(clause.where)
        .exec(function(e, v) {
          v.map(function(e) {
            return new (self)(v);
          });

          done(e, v);
        }); 
    } else {
      done(valid.errors, null);
    }
  }
  else {
    Object.keys(obj).forEach(function(k) {
      self.set(key, obj[key]);
    });

    self.save(function(e) {
      if(fn) {
        fn(e, self);
      }

      if(e && em.listeners('error')) em.emit('error', e);

      if(!e) em.emit('success', self);
    });
  }
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

  var result = validateFields.call(this, w);

  w = result.shift();
  var valid = result.shift();

  if(!valid || (valid && valid.valid)) {
    new Query()
      .delete(this._table)
      .where(w)
      .exec(function(e) {
        function done() {
          if(fn) {
            fn(e);
          }

          if(e && em.listeners('error')) em.emit('error', e);

          if(!e) em.emit('success');
        }

        if(hater._relationships.manyToMany[self._name]) {
          var rels = hater._relationships.manyToMany[self._name],
              todo = rels.length,
              emi  = new Emitter();

          emi.on('done', function() {
            if(!(--todo)) {
              done();
            }
          });

          rels.forEach(function(other) {
            var Table = 
              hater._models[other + inflection.capitalize(self._name)] ||
              hater._models[self._name + inflection.capitalize(other)] ;

            var where = {};
            where[self._name + '_id'] = self.get('id');
           
            new Query()
              .delete(inflection.pluralize(Table._name))
              .where(where)
              .exec(function() {
                emi.emit('done');
              });
          });
        }
        else {
          done();
        }
      });
  } else {
    if(fn) {
      fn(valid.errors, null);
    }
    
    if(em.listeners('error'))
      em.emit('error', valid.errors);
  }
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
    
    if(!e) em.emit('success', res);
    else {
      if(em.listeners('error')) em.emit('error', e);
    }
      
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

  var result = validateFields.call(this, fields);
  fields = result.shift();
  var valid = result.shift();
  
  if(!valid || (valid && valid.valid)) {
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

        if (e || err) {
          if(em.listeners('error')) em.emit('error', e || err);
        }
        else em.emit('success', self);
      }
      return !skip ?
        utile.async.series([
          syncOneToOne.bind(self),
          syncManyToMany.bind(self),
          syncManyToOne.bind(self),
          syncOneToMany.bind(self)
        ], done) :
        done()   ;
      
    });
  } else {
    if(fn) {
      fn(valid.errors, null);
    }

    if(em.listeners('error'))
      em.emit('error', valid.errors);
  }
   
  return em;
};


/**
 * Syncs one to many relationships
 *
 * Examples:
 *
 *    syncOneToMany.call(instance, function() { ... });
 *
 * @param {Function} callback
 * @api private
 */

function syncOneToMany(done) {
  var self = this,
      rels = hater._relationships.hasMany[this._name];
  
  if(rels && rels.length) {
    
    (function iterator(keys) {
      var childName = keys.shift();
      if(!childName) { return done(null); }

      var children = self.get(inflection.pluralize(childName));

      if(children && children.length) {
        var todo = children.length,
            em   = new Emitter();
        
        em.on('done', function() {
          if(!(--todo)) {
            iterator(keys);
          }
        });
        em.on('error', function(e) {
          done(e);
        });
        
        children.forEach(function(child) {
          child.set(self._name + '_id', self.get('id'));
          child.save(true, function(e) {
            return !e ?
              em.emit('done')    :
              em.emit('error', e);
          });
        });
      } else {
        iterator(keys);
      }

    })(rels.slice(0));

  } else {
    done(null);
  }
}


/**
 * Syncs many to one relationships
 *
 * Examples:
 *
 *    syncManyToOne.call(instance, function() { ... });
 *
 * @param {Function} callback
 * @api private
 */

function syncManyToOne(done) {
  var self = this,
      rels = hater._relationships.belongsTo[this._name];
  
  if(rels && rels.length) {

    (function iterator(keys) {
      var parentName = keys.shift();
      if(!parentName) { return done(null); }

      var parent = self.get(parentName);

      if(parent) {
        var setId = function() {
          self.set(parent._name + '_id', parent.get('id'));
          self.save(function() {
            iterator(keys);
          });
        };

        return parent.get('id') ?
          setId()           :
          parent.save(setId);
      }

    })(rels.slice(0));

  } else {
    done(null);
  }
}

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
              if(e && em.listeners('error')) em.emit('error', e);

              if(!res.length) {
                Table.create(link, function(e) {
                  if (e && em.listeners('error')) em.emit('error', e);

                  if(!e) emitter.emit('done');
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
              if(e && em.listeners('error')) em.emit('error', e);

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
  var self = this;
  if (!this._schema)
    this._schema = {};
   
  Object.keys(obj).forEach(function(key) {
    self._schema[key] = obj[key];
  });
  
  return this;
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
 * Validates fields against schemas
 *
 * Examples:
 *
 *    validateFields.call(instance, obj);
 *
 * @param {Object} object
 * @api private
 */

function validateFields(obj) {
  var self = this,
      errs = [];
  
  obj = utile.filter(obj, function(v, k) {
    return typeof self._schema[k] !== 'undefined';
  });


  return hater._validators[this._name] ?
    [obj, revalidator.validate(obj, { properties: hater._validators[this._name] })] :
    [obj] ;
}

/**
 * Creates new Model
 *
 * Examples:
 *
 *    hater.define('table', { extended: function() { return this.find(...) } });
 *
 * @param {String} table
 * @param {Object} extend
 * @api public
 */

model.define = function(table, proto) {

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
      value     : hater._models[table]._schema,
      writable  : true,
      enumerable: false
    });

  }

  Factory._name     = table;
  Factory._validate = {};

  Factory.prototype = utile.mixin(factoryPrototype, require('./relationships'));
  Factory.prototype.__proto__ = new Emitter();

  Factory.__proto__ = factoryPrototype;
  Factory._table = inflection.pluralize(table);
  
  return hater._models[table] = Factory;
};
