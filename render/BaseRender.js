/**
 * Created by lanhao on 2017/9/6.
 */

'use strict';

const fs = require('fs');
const EOL = require('os').EOL;

class BaseRender {
  constructor(definition) {
    this.definition = definition;
    this.output = [];
    this.data = {};
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
    fs.writeFileSync(this.fileName(), this.output.join(EOL));
  }
}

module.exports = BaseRender;