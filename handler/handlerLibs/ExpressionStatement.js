/**
 * Created by lanhao on 2017/9/3.
 */

'use strict';

const AssignmentExpression = require('./AssignmentExpression');

module.exports = (item) => {
  let expression = item.expression;

  switch (expression.type) {
    case 'AssignmentExpression':
      return AssignmentExpression(expression.right);
      break;

  }
};