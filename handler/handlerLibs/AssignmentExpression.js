/**
 * Created by lanhao on 2017/9/4.
 */

'use strict';
const astObject = require('../../lib/astObject');

const AssignmentExpression = (item) => {
  switch (item.type) {
    case 'Literal':
      return 'todo';
      break;
    case 'AssignmentExpression':
      return AssignmentExpression(item.right);
    case 'ObjectExpression':
      let obj = astObject({
        id:{name:''},
        init: item,
      });
      return [obj];
      break;
    default:
      break;
  }
};

module.exports = AssignmentExpression;