var hater         = require('./hater'),
    i             = require('inflection'),
    relationships = module.exports;

/**
 * Sets up _relationships in hater
 *
 * Examples:
 *    helpSetup('oneToOne', name, name2);
 *
 * @param {String} type
 * @param {String} model1
 * @param {String} model2
 * @api private
 */

function helpSetup(type, first, second) {
  var firstArr = hater._relationships[type][first] || [];
  firstArr.push(second);
  hater._relationships[type][first] = firstArr;

  var secondArr = hater._relationships[type][second] || [];
  secondArr.push(first);
  hater._relationships[type][second] = secondArr;
}

/**
 * Defines one to many relationships
 *
 * Examples:
 *    hater.Relationships.oneToMany(Parent, Child);
 *
 * @param {Function} parent
 * @param {Function} child
 * @api public
 */

relationships.oneToMany = function(Parent, Child) {
  var parentArr = hater._relationships.hasMany[Parent._name] || [];
  parentArr.push(Child._name);
  hater._relationships.hasMany[Parent._name] = parentArr;

  var childArr = hater._relationships.belongsTo[Child._name] || [];
  childArr.push(Parent._name);  
  hater._relationships.belongsTo[Child._name] = childArr;

  var cProps = {};
  cProps[Parent._name + '_id'] = hater.Types.Integer();
  
  Child.addProperties(cProps);
};

/**
 * Defines many to many relationships
 * 
 * Examples:
 *
 *    hater.Relationships.manyToMany(First, Second);
 *
 * @param {Function} first
 * @param {Function} second
 * @api public
 */

relationships.manyToMany = function(First, Second) {
  helpSetup('manyToMany', First._name, Second._name);

  var Schema = {};
  Schema[First._name  + '_id'] = hater.Types.Integer();
  Schema[Second._name + '_id'] = hater.Types.Integer();
  
  hater
    .define(First._name + i.capitalize(Second._name))
    .schema(Schema); 
};

/**
 * Defines one to one relationships
 *
 * Examples:
 *
 *    hater.Relationships.oneToOne(First, Second);
 * 
 * @param {Function} first
 * @param {Function} second
 * @api public
 */ 

relationships.oneToOne = function(First, Second) {
  helpSetup('oneToOne', First._name, Second._name);

  var fProps = {};
  fProps[Second._name + '_id'] = hater.Types.Integer();
  First.addProperties(fProps);

  var sProps = {};
  sProps[First._name + '_id'] = hater.Types.Integer();
  Second.addProperties(sProps);   
};
