var types = exports;

types.types = {
  'Integer': 'INT',
  'String': function(obj) {
    if (obj && obj.length)
      return 'VARCHAR('+obj.length+')';

    return 'TEXT';
  },
  'Serial': function(obj) {
    if (require('./hater').name === 'mysql')
      return 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY';
    else
      return 'SERIAL';
  },
  'Boolean': 'BOOLEAN',
  'Blob': 'BLOB',
  'Date': 'DATETIME'
};


types.builder = function(obj) {
  var column = '';

  Object.keys(obj).forEach(function(x) {
    var t;

    if (typeof obj[x] === 'object') {
      t = obj[x];
      
      if (!t.type)
        throw new Error('You must declare a type');

      column += t.type;

      if (t.primary)
        column += ' primary key';

      if (t.auto_increment)
        column += ' auto_increment';
    } else {
      column += obj[x];
    }

    obj[x] = column;
    column = '';
  });

  return obj;
}