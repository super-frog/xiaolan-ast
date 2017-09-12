/**
 * Created by lanhao on 2017/9/2.
 */

'use strict';
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
      break;
    case 'ObjectExpression':
      return astObject(declaretions.id.name,declaretions.init.properties);
      break;
    default:
      break;
  }
}

