
const esprima = require('esprima');
const fs = require('fs');
const render = require('../render/ErrorRender');

let handlerMap = {
  VariableDeclaration: require('./handlerLibs/VariableDeclaration'),
};

module.exports = (file, output) => {
  let ast;
  try {
    ast = esprima.parseScript(fs.readFileSync(file).toString(), {
      attachComment: true,
    });
  } catch (e) {
    throw new Error(file, e.message);
    
  }

  let definitions = [];
  for (let k in ast.body) {
    let item = ast.body[k];
    if (item.type && handlerMap[item.type]) {
      let r = new render(handlerMap[item.type](item), output);
      r.toFile();
      definitions.push(r);
    }
  }
  return definitions;
};