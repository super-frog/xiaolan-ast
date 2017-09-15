/**
 * Created by lanhao on 2017/9/6.
 */

'use strict';

const fs = require('fs');
const EOL = require('os').EOL;
const path = require('path');

class BaseRender {
  constructor(definition) {
    this.definition = definition;
    this.output = [];
    this.data = {};
    this.ouputPath = '';
  }

  fileName() {
    return `${process.cwd()}/${this.definition.name}.gen.js`;
  }

  findToken(line) {
    let tokens = [];
    let patten = /_(.*?)_/g;
    return line.match(patten);
  }

  toFile() {
    if(fs.existsSync(path.resolve(this.ouputPath))){
      fs.writeFileSync(`${path.resolve(this.ouputPath)}/${this.definition.name}.gen.js`, this.output.join(EOL));
    }else {
      fs.writeFileSync(this.fileName(), this.output.join(EOL));
    }
  }
}

module.exports = BaseRender;