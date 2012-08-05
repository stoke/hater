var hater = exports;

/**
 * Default values
 */

hater.builder = require('./builders/postgresql');
hater.dialect = require('./dialect').use;
hater.Model   = require('./model');
