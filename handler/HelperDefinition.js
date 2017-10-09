/**
 * Created by lanhao on 2017/10/9.
 */

'use strict';

const esprima = require('esprima');
const fs = require('fs');
const render = require('../render/objectRender');

let handlerMap = {
  SwitchStatement: require('./handlerLibs/SwitchStatement'),
};



module.exports = (file) => {
  let ast;
  try {
    ast = esprima.parseScript(fs.readFileSync(file).toString().replace('#!/usr/bin/env node',''), {
      attachComment: true,
    });
  }catch(e){
    throw new Error(file, e.message);
    return;
  }
  
  let definitions = {};
  for(let k in ast.body) {
    let item = ast.body[k];

    if (item.type && handlerMap[item.type]) {
      definitions = handlerMap[item.type](item);
    }
  }

  return definitions;
};