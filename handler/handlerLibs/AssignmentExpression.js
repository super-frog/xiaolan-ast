
const astObject = require('../../lib/astObject');

const AssignmentExpression = (item) => {
  switch (item.type) {
  case 'Literal':
    return 'todo';
  case 'AssignmentExpression':
    return AssignmentExpression(item.right);
  case 'ObjectExpression':
    let obj = astObject({
      id:{name:''},
      init: item,
    });
    return [obj];
  default:
    break;
  }
};

module.exports = AssignmentExpression;