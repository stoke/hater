var types = exports;

types.types = {
  'Integer': function(obj) { return 'INT' },
  'String': function(obj) {
    if (obj && obj.length)
      return 'VARCHAR('+obj.length+')';

    return 'TEXT';
  },
  'Serial': function(obj) {
    if (require('./hater').builder.name === 'mysql')
      return 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY';
    else
      return 'SERIAL';
  },
  'Boolean': function(obj) { return 'BOOLEAN' },
  'Blob': function(obj) { return 'BLOB' },
  'Date': function(obj) { return 'DATETIME' }
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