
const esprima = require('esprima');
const fs = require('fs');
const render = require('../render/objectRender');

let handlerMap = {
  VariableDeclaration: require('./handlerLibs/VariableDeclaration'),
};

module.exports = (file, output) => {
  let ast;
  try {
    ast = esprima.parseScript(fs.readFileSync(file).toString(), {
      attachComment: true,
    });
  }catch(e){
    throw new Error(file, e.message);
  }

  let definitions = [];
  for(let k in ast.body) {
    let item = ast.body[k];

    if (item.type && handlerMap[item.type]) {
      let definition = handlerMap[item.type](item);
      //console.log(JSON.stringify(definition));process.exit(0);
      if(definition) {
        let r = new render(definition, output);
        r.toFile();
        definitions.push(r);
      }
    }
  }

  return definitions;
};
