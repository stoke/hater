var Emitter     = require('eventemitter2').EventEmitter2,
    inflection  = require('inflection'),
    utile       = require('utile'),
    async       = utile.async,
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
 * Unlinks Relationship
 *
 * Examples:
 *
 *    Instance.unlink('models', { where: { key: 'value' } }, function(e) { ... });
 *
 * @param {Object} child
 * @param {Function} callback
 * @api public
 */

factoryPrototype.unlink = function(Child, fn) {
  var self = this;

  if(
    hater._relationships.manyToMany[this._name] && 
    ~hater._relationships.manyToMany[this._name].indexOf(inflection.singularize(Child._name))
  ) {
    var Table = 
      hater._models[Child._name + inflection.capitalize(this._name)] ||
      hater._models[this._name + inflection.capitalize(Child._name)] ;
    
    var where = {};
    where[Child._name + '_id'] = Child.get('id');
    where[this._name  + '_id'] = this.get('id');
    
    Table.destroy(where, fn);
  }   

  else {
    fn(null);
  } 
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
      query = new Query(),
      em = new Emitter();

  if(options.join) {
    var join  = {}, where = {},
        Table = options.join.table,
        id    = options.join.id;

    join[inflection.pluralize(self._name) + '.id'] = inflection.pluralize(Table) + '.' + self._name + '_id';

    if(Object.keys(options.where)) {
      Object.keys(options.where).forEach(function(k) {
        if(typeof options.where[k] !== 'object')
          where[self._table + '.' + k] = options.where[k];
      });
    }

    options.where = where;
    options.where[inflection.pluralize(Table) + '.' + options.join.other + '_id'] = id; 
    
    query.select(this._table, inflection.pluralize(self._name) + '.*');
    query.join(inflection.pluralize(Table), join);
  }
  else {
    query.select(this._table, '*');
  }

  if (options.where) {
    var own = utile.filter(options.where, function(v, k) { return typeof v !== 'object' || (v instanceof RegExp); });
    if(Object.keys(own).length)
      query.where(own);
  }

  if(options.orderBy && options.orderBy[this._name]) {
    query.orderBy(options.orderBy[this._name]);
  }

  if(options.limit && (options.limit[this._name] || options.limit[this._table])) {
    var limit = options.limit[this._name] || options.limit[this._table];
    query.limit.apply(query, Array.isArray(limit) ?
      limit.map(function(v) { return parseInt(v, 10); }) :
      [parseInt(limit, 10)] );
  }
  query.exec(function(e, v) {
    if(e) return fn(e);
    function done(e, v) {
      if(e) {
        if(em.listeners('error')) em.emit('error', e);

        if(fn) fn(e);
        return;
      }
      em.emit('success', v);
      if(fn) fn(null, v); 
    }
    
    if (v && v.length) {
      var results = [];
      async.forEach(v,
        function(x, cbl) {
          var instance = new (self)(x);
          results.push(instance);

          return options.fetch ?
            self.fetch.call(instance, options, cbl) :
            cbl() ; 
        },
        function(e) {
          done(e, results);
        });
    }
    else {
      done(null, null);
    }
   
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

    cbl(e, Array.isArray(r) ? r.shift() : null);
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
  this.fetch(what, callback);
};


/**
 * Fetches relationships
 *
 * Examples:
 *
 *    Model.fetch();
 *
 * @param {Array}  children
 * @param {Object} callback
 * @api private
 */

factoryPrototype.fetch = function(options, callback) {
  var children = options.fetch,
      instance = this;
  
  async.forEach(children,
    function(elem, cbl) {
      var rest       = elem.split('.'),
          parsed     = rest.shift(),
          childNames;
    
      if(~parsed.indexOf('{')) {
        childNames = parsed.substring(0, parsed.length-1).substring(1, parsed.length-1).split(',');
      } else {
        childNames = [parsed];
      }
    
      async.forEach(childNames,
        function(childName, done) {
          var clause = { where: {}, limit: options.limit, orderBy: options.orderBy },
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
              clause.fetch = [rest.join('.')];
            }
  
            if(oneToOne && ~oneToOne.indexOf(childName)) {
              Child = hater._models[childName];

              clause.where[instance._name + '_id'] = instance.get('id');

              Child.find(clause, function(e, children) {
                instance.set(childName, children.shift());
                done(e || null);
              });
            } 
    
            if(manyToMany && ~manyToMany.indexOf(inflection.singularize(childName))) {
              childName = inflection.singularize(childName);
              Child = hater._models[childName];
              var Table = 
                hater._models[Child._name + inflection.capitalize(instance._name)] ||
                hater._models[instance._name + inflection.capitalize(Child._name)] ;
              
              clause.where = utile.mixin(clause.where, (options.where || {})[inflection.pluralize(Child._name)] || {});
              clause.join  = { table: Table._name, id: instance.get('id'), other: instance._name };
              
              Child.find(clause, function(e, res) {
                if(e) return done(e);
                
                instance.set(inflection.pluralize(Child._name), res);
                done(null);

              });              
            }
      
            if(hasMany && ~hasMany.indexOf(inflection.singularize(childName))) {
              Child = hater._models[inflection.singularize(childName)];
              clause.where[instance._name + '_id'] = instance.get('id');

              clause.where = utile.mixin(clause.where, (options.where || {})[childName] || {});
  
              Child.find(clause, function(e, children) {
                instance.set(childName, children);
                done(e || null);
              });
            } 

            if(belongsTo && ~belongsTo.indexOf(childName)) {
              Child = hater._models[childName];
              clause.where.id = instance.get(childName + '_id');

              clause.where = utile.mixin(clause.where, (options.where || {})[childName] || {});  

              Child.findOne(clause, function(e, parent) {
                instance.set(childName, parent);
                done(e || null);
              });
            }
  
          }
          else {
            done(null);
          }
        },
        function(e) {
          cbl(e || null);
        });
    },
    function(e) {
      callback(e || null);
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
          var rels = hater._relationships.manyToMany[self._name];

          async.forEach(rels,
            function(other, cbl) {
              var Table = 
                hater._models[other + inflection.capitalize(self._name)] ||
                hater._models[self._name + inflection.capitalize(other)] ;

              var where = {};
              where[self._name + '_id'] = self.get('id');
           
              new Query()
                .delete(inflection.pluralize(Table._name))
                .where(where)
                .exec(function(e) {
                  cbl(e || null);
                });
            },
            function(e) {
              done(e || null);
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
    
    async.forEach(rels,
      function(childName, cbl) {    
        var children = self.get(inflection.pluralize(childName));

        if(children && children.length) {

          async.forEach(children,
            function(child, callback) {
              child.set(self._name + '_id', self.get('id'));

              child.save(function(e) {
                return !e ?
                  callback(null) :
                  callback(e)    ;
              });
            },
            function(e) {
              cbl(e || null);
            });
        } else {
          cbl(null);
        }
      },
      function(e) {
        done(e || null);
      });
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
    async.forEach(rels,
      function(parentName, cbl) {
        var parent = self.get(parentName);
        
        if(parent) {
          var setId = function() {
            self.set(parent._name + '_id', parent.get('id'));
            self.save(function(e) {
              return !e ?
                cbl(null) :
                cbl(e)    ;
            });
          };

          return parent.get('id') ?
            setId()           :
            parent.save(setId);
        }
        else {
          cbl(null);
        }
      },
      function(e) {
        done(e || null);
      });

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
    async.forEach(rels,
      function(childName, cbl) {
        var child = self.get(childName);
        if(child) {
          child.set(self._name + '_id', self.get('id'));
          child.save(function(e) {
            if(e) return cbl(e);
         
            self.set(child._name + '_id', child.get('id'));
            self.save(true, function(e) {
              if(e) return cbl(e);
              
              self.set(childName, child);
              cbl(null);
            });
          });
        }
        else {
          cbl(null);
        }
      },
      function(e) {
        done(e || null);
      });
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
    async.forEach(rels,
      function(childName, cbl) {
        if(self.get(inflection.pluralize(childName))) {
          var children = self.get(inflection.pluralize(childName)); 

          async.forEach(children,
            function(child, callback) {
              var Table = 
                hater._models[child._name + inflection.capitalize(self._name)] ||
                hater._models[self._name + inflection.capitalize(child._name)] ;
          
              var link = {};
              link[self._name + '_id'] = self.get('id');

              function setTable(link) {
              
                Table.findOrCreate({ where: link }, function(e, res) {
                  return !e ?
                    callback(null) :
                    callback(e)    ;
                });

              }

              if(child.get('id')) {
                link[child._name + '_id'] = child.get('id');
                setTable(link);
              }
              else {
                child.save(function(e) {
                  if(e) return callback(e);

                  link[child._name + '_id'] = child.get('id');
                  setTable(link);
                });
              } 
          },
          function(e) {
            cbl(e || null);
          });
        } else {
          cbl(null);
        }
      },
      function(e) {
        done(e || null);
      });       
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
