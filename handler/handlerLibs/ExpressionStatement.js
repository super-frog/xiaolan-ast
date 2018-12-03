
const AssignmentExpression = require('./AssignmentExpression');

module.exports = (item) => {
  let expression = item.expression;

  switch (expression.type) {
  case 'AssignmentExpression':
    return AssignmentExpression(expression.right);
  }
};