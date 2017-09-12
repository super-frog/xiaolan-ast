/**
 * Created by lanhao on 2017/9/2.
 */

'use strict';
const render = require('../render/objectRender');

let handlerMap = {
  VariableDeclaration: require('./handlerLibs/VariableDeclaration'),
};

module.exports = (item) => {

  let definition = null;
  if (item.type && handlerMap[item.type]) {
    definition = handlerMap[item.type](item);
  }

  if (definition) {
    let r = new render(definition);
    r.toFile();
  }

};
