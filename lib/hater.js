var hater = exports;

/**
 * Default values
 */

hater.builder       = require('./builders/postgresql');
hater.dialect       = require('./dialect').use;
hater.Relationships = require('./relationships');
hater.extend        = require('./model').extend;
hater._models       = {};
hater.Types         = require('./types').types;
