/**
 * Created by lanhao on 2017/9/4.
 */

'use strict';

const EOL = require('os').EOL;
const templateBank = require('../tpl/templateBank');
const py = require('frog-lib').pinyin;

const BaseRender = require('./BaseRender');

let render = {};

class Render extends BaseRender {
  constructor(definition) {
    super(definition);

    this.data._name_ = definition.name;

    this.data._depends_ = new Set();

    this.data._init_ = this.classConstructorBody();

    this.data._method_ = [];

    this.data._method_.push(this.fromRequestFunc());

    for (let k in definition.enumSet) {
      this.data._method_.push(this.enumFunc(k, definition.enumSet[k]));
    }

    this.data._method_.push(this.validateFunc());

    this.data._depends_ = Array.from(this.data._depends_);

    let tpl = templateBank('ObjectClass').split(EOL);
    for (let k in tpl) {
      let tokens = this.findToken(tpl[k]);
      if (tokens) {
        for (let i in tokens) {
          this.output = this.output.concat(this.renderLine(tpl[k], tokens[i], this.data[tokens[i]]));
        }
      } else {
        this.output.push(tpl[k]);
      }
    }
  }


  classConstructorBody() {
    let props = this.definition.props;
    let output = [];

    for (let k in props) {
      if (props[k].definition.type.name === 'ref') {
        this.data._depends_.add(`const ${props[k].definition.type.ref.name} = require(\'./${props[k].definition.type.ref.name}.gen\');`);
        output.push(`this.${props[k].name} = new ${props[k].definition.type.ref.name}(options.${props[k].name}) || ${this.getDefaultValue(props[k].definition)};`);
        let r = new Render(props[k].definition.type.ref);
        r.toFile();
        continue;
      }
      output.push(`this.${props[k].name} = options.${props[k].name} || ${this.getDefaultValue(props[k].definition)};`);
    }
    return output;
  }

  getDefaultValue(fieldDefinition = {}) {
    let type = fieldDefinition.type ? fieldDefinition.type.name : 'string';
    switch (type) {
      case 'string':
        return `'${fieldDefinition.defaultValue || ''}'`;
        break;
      case 'enum':
      case 'integer':
        return `${fieldDefinition.defaultValue || 0}`;
        break;
      case 'array':
        return `['${fieldDefinition.defaultValue.join('\',\'')}']`;
        break;
      case 'ref':
        return `new ${fieldDefinition.type.ref.name}({})`;
        break;
    }
  }

  enumFunc(field, enumSet) {
    return `get${py.camel(field, true)}(){
    return ['${enumSet.join('\',\'')}'][this.${field}];
  }${EOL}`;
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

  validateFunc() {
    let props = this.definition.props;
    let output = `validate(){${EOL}`;

    for (let k in props) {
      if (props[k].ref !== undefined) {

      } else {
        switch (props[k].definition.type.name) {
          case 'string':
            output += `    if(!((typeof this.${props[k].name} === 'string') && (this.${props[k].name}.length>${props[k].definition.type.length[0]}) && (this.${props[k].name}.length<${props[k].definition.type.length[1]}))){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: String length must between ${props[k].definition.type.length[0]} to ${props[k].definition.type.length[1]}');${EOL}`;
            output += `    }${EOL}${EOL}`;
            break;
          case 'integer':
            output += `    if(!(Number.isInteger(this.${props[k].name}) && (this.${props[k].name}>=${props[k].definition.type.range[0]}) && (this.${props[k].name}<=${props[k].definition.type.range[1]}))){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: Number must in range ${props[k].definition.type.range[0]} to ${props[k].definition.type.range[1]}');${EOL}`;
            output += `    }${EOL}${EOL}`;
            break;
          case 'enum':
            output += `    if(['${props[k].definition.type.options.join('\',\'')}'][this.${props[k].name}] === undefined){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: ${props[k].name} can only choosing from ["${this.arrayDisplay(props[k].definition.type.options)}"]');${EOL}`;
            output += `    }${EOL}${EOL}`;
            break;
          default:
            break;
        }
      }
    }
    output += `  }${EOL}`;

    return output;
  }

  fromRequestFunc() {
    let definition = this.definition;
    let className = definition.name;
    let props = definition.props;
    let output = `static fromRequest(req){${EOL}`;
    output += `    let options={};${EOL}`;
    for (let k in props) {
      if (props[k].definition.in === undefined) {
        continue;
      }
      output += `    options.${props[k].name} = req.${props[k].definition.in} && req.${props[k].definition.in}.${props[k].name} || ${this.getDefaultValue(props[k].definition)};${EOL}`;
    }
    output += `    return new ${className}(options);${EOL}`;
    output += `  }${EOL}`;

    return output;
  }

  arrayDisplay(arr) {
    let output = ``;
    for (let k in arr) {
      output += ` ${k} -> ${arr[k]}  ,`;
    }
    return output;
  }

}

module.exports = Render;
