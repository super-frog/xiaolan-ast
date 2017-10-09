/**
 * Created by lanhao on 2017/10/9.
 */

'use strict';

const EOL = require('os').EOL;

let SwitchStatement = (statement)=>{
  let result = {};
  let cases = statement.cases;
  for(let k in cases){
    if(cases[k].test === null){
      continue;
    }
    result[cases[k].test.value] = caseStatement(cases[k]);
  }
  return result;
};

function caseStatement(caseItem) {
  let name = caseItem.test.value;
  let firstComments = caseItem.leadingComments[0].value.split(' ');
  firstComments.shift();
  let desc = firstComments.shift();
  let usage = firstComments.join(' ');
  caseItem.leadingComments.shift();
  for(let k in caseItem.leadingComments){
    usage += `${EOL}  ${caseItem.leadingComments[k].value}`;
  }
  return {
    name,
    desc,
    usage,
  };
}

module.exports = SwitchStatement;