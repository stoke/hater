var hater         = require('./hater'),
    relationships = module.exports;

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

  Parent._relationships.hasMany.push(Child._name);
  Child._relationships.hasOne.push(Parent._name);

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

  First._relationships.hasMany.push(Second._name);
  Second._relationships.hasMany.push(First._name);

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
  var arr = hater._relationships.oneToOne[First._name] || [];
  arr.push(Second._name);

  hater._relationships.oneToOne[First._name] = arr;  
};
