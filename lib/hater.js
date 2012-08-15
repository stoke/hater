var hater = exports;

/**
 * Default values
 */

hater.builder        = require('./builders/postgresql');
hater.connect        = require('./dialect').use;
hater.Relationships  = require('./relationships');
hater.define         = require('./model').define;
hater._models        = {};
hater._relationships = {
  hasMany   : {},
  manyToMany: {},
  oneToOne  : {},
  belongsTo : {}
};
hater._validators    = {};
hater.Types          = require('./types').types;
hater.sync           = require('./sync');
