const astObject = require('../../lib/astObject');

module.exports = (item) => {
  let declarations = item.declarations;
  return getVarDefine(declarations[0]);
};

function getVarDefine(declaretions) {
  if (declaretions.init === null) {
    return null;
  }
  
  switch (declaretions.init.type) {
  case 'Literal':
    return 'todo';
  case 'ObjectExpression':
    return astObject(declaretions.id.name,declaretions.init.properties);
  default:
    break;
  }
}

