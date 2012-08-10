var hater = exports;

/**
 * Default values
 */

hater.builder        = require('./builders/postgresql');
hater.dialect        = require('./dialect').use;
hater.Relationships  = require('./relationships');
hater.extend         = require('./model').extend;
hater._models        = {};
hater._relationships = {
  oneToMany : {},
  manyToMany: {},
  oneToOne  : {}
};
hater.Types          = require('./types').types;
hater.sync           = require('./sync');
