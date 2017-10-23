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
    return `${process.cwd()}/${this.data._name_}.gen.js`;
  }

  findToken(line) {
    let tokens = [];
    let patten = /_(.*?)_/g;
    return line.match(patten);
  }

  renderLine(line, toekn, data) {
    if (Array.isArray(data) && data.length > 0) {
      let output = [];
      for (let k in data) {
        output.push(line.replace(toekn, data[k]));
      }
      return output;
    } else {
      return [line.replace(toekn, data)];
    }
  }

  toFile() {
    if (!fs.existsSync(path.resolve(this.ouputPath))) {
      fs.mkdirSync(path.resolve(this.ouputPath));
    }
    fs.writeFileSync(`${path.resolve(this.ouputPath)}/${this.data._name_}.gen.js`, this.output.join(EOL));
    console.log('File generated in : ' + `${path.resolve(this.ouputPath)}/${this.data._name_}.gen.js`);
  }
}

module.exports = BaseRender;