var hater = require('./hater'),
    types = exports;

types.types = {};

types.types.Integer = function(obj) {
  obj = obj || {};
  
  obj.string = 'INT';

  return obj; 
};

types.types.String = function(obj) {
  obj = obj || {};

  obj.string = (obj && obj.length) ?
    'VARCHAR(' + obj.length + ')' :
    'TEXT';

  return obj;
};

types.types.Serial = function(obj) {
  obj = obj || {};

  obj.string = (hater.builder.name === 'mysql') ?
    'INT NOT NULL AUTO_INCREMENT PRIMARY KEY' :
    'SERIAL';
  return obj;
};

types.types.Boolean = function(obj) {
  return 'BOOLEAN';
};

types.types.Blob = function(obj) { 
  return 'BLOB'; 
};

types.types.Date = function(obj) {
  return 'DATETIME';
};

types.builder = function(obj) {
  var column = '',
      self   = this;
  
  Object.keys(obj).forEach(function(x) {
    var t;
    
    if (typeof obj[x] === 'object') {
      t = obj[x];

      if(t.validate) {
        var validator = hater._validators[self._name] || {};
        validator[x] = t.validate;
        hater._validators[self._name] = validator;
      }

      column += t.string;
    } else {
      column += obj[x];
    }

    obj[x] = column;
    column = '';
  });
  
  return obj;
};
