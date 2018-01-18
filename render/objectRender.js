/**
 * Created by lanhao on 2017/9/4.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const EOL = require('os').EOL;
const templateBank = require('../tpl/templateBank');
const py = require('frog-lib').pinyin;

const BaseRender = require('./BaseRender');

class ObjectRender extends BaseRender {
  constructor(definition, output) {

    super(definition);
    this.ouputPath = output;
    this.data._name_ = definition.name;
    this.data._validate_ = 'this.validate();';
    this.data._depends_ = new Set();

    this.data._init_ = this.classConstructorBody();

    this.data._method_ = [];

    this.data._method_.push(this.fromRequestFunc());

    for (let k in definition.enumSet) {
      this.data._method_.push(this.enumFunc(k, definition.enumSet[k]));
    }

    if(Object.keys(definition.enumSet).length){
      this.listEnum(definition.enumSet);
    }
    
    this.data._method_.push(this.validateFunc());

    this.data._method_.push(this.pickFunc());

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

  listEnum(enumSet){
    let content = `module.exports = ${JSON.stringify(enumSet,null,2)};`
    fs.writeFileSync(`${path.resolve(this.ouputPath)}/Enum.js`, content);
    console.log('File generated in : ' + `${path.resolve(this.ouputPath)}/Enum.js`);
  }

  pickFunc() {
    return `static pick(source, path, type=null, defaultValue=null){
    let paths = path.split('.');
    let tmp = source;
    for(let k in paths){
      if(tmp[paths[k]]){
        tmp = tmp[paths[k]];
      }else{
        tmp = tmp[paths[k]];
        break;
      }
    }
    if(tmp===undefined){
      return defaultValue;
    }
    switch (type){
      case 'string':
      case 'enum':
        if(typeof tmp === 'object'){
          tmp = JSON.stringify(tmp);
        }else{
          tmp = tmp.toString();
        }
        break;
      case 'number':
        tmp = 1*tmp;
        break;
    }
    return (defaultValue && (undefined===tmp)) ? defaultValue: tmp;
  }`;
  }

  classConstructorBody() {
    let props = this.definition.props;
    let output = [];
    for (let k in props) {
      if (props[k].definition.type.name === 'ref') {
        this.data._depends_.add(`const ${props[k].definition.type.ref.name} = require(\'./${props[k].definition.type.ref.name}.gen\');`);
        output.push(`this.${props[k].name} = new ${props[k].definition.type.ref.name}(options.${props[k].name}) || ${this.getDefaultValue(props[k].definition)};`);
        let r = new ObjectRender(props[k].definition.type.ref, this.ouputPath);
        r.toFile();
        continue;
      }
      output.push(`this.${props[k].name} = options.${props[k].name}${props[k].definition.requirement === true ? `` : ` || ${this.getDefaultValue(props[k].definition)}`};`);
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
      case 'number':
        return `${fieldDefinition.defaultValue || 0}`;
        break;
      case 'array':
        if (fieldDefinition.defaultValue.length) {
          return `['${fieldDefinition.defaultValue.join('\',\'')}']`;
        } else {
          return '[]';
        }
        break;
      case 'ref':
        return `new ${fieldDefinition.type.ref.name}({})`;
        break;
    }
  }

  enumFunc(field, enumSet) {
    return `get${py.camel(field, true)}(){
    return (${JSON.stringify(enumSet.options)})[this.${field}];
  }${EOL}`;
  }

  validateFunc() {
    let props = this.definition.props;
    let output = `validate(){${EOL}`;

    for (let k in props) {
      if (props[k].ref !== undefined) {

      } else {
        switch (props[k].definition.type.name) {
          case 'string':
            output += `    if(!((typeof this.${props[k].name} === 'string') && (this.${props[k].name}.length>=${props[k].definition.type.length[0]}) && (this.${props[k].name}.length<=${props[k].definition.type.length[1]}))){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: String length must between ${props[k].definition.type.length[0]} to ${props[k].definition.type.length[1]}');${EOL}`;
            output += `    }${EOL}${EOL}`;
            break;
          case 'number':
            output += `    if(!(!Number.isNaN(this.${props[k].name}) && (this.${props[k].name}>=${props[k].definition.type.range[0]}) && (this.${props[k].name}<=${props[k].definition.type.range[1]}))){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: Number must in range ${props[k].definition.type.range[0]} to ${props[k].definition.type.range[1]}');${EOL}`;
            output += `    }${EOL}${EOL}`;
            break;
          case 'enum':
            output += `    if((${JSON.stringify(props[k].definition.type.options)})[this.${props[k].name}] === undefined){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: ${props[k].name} can only choosing from ["${this.arrayDisplay(props[k].definition.type.options)}"]');${EOL}`;
            output += `    }${EOL}${EOL}`;
            break;
          case 'array':
            output += `    if(!(Array.isArray(this.${props[k].name}) && (this.${props[k].name}.length===0 || typeof this.${props[k].name}[0] === '${this.typeMap(props[k].definition.type.member.name)}'))){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: must be array of [${props[k].definition.type.member.name}]');${EOL}`;
            output += `    }${EOL}${EOL}`;
            break;
          case 'ref':
            let refName = props[k].definition.type.ref.name;
            output += `    if(!(this.${props[k].name} instanceof ${refName} )){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: must be instance of  [${refName}]');${EOL}`;
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
      if (props[k].definition.requirement === true) {
        output += `    if(!this.pick(req, '${props[k].definition.in}.${props[k].definition.key || props[k].name}')){
      throw new Error("Requirement : [${props[k].definition.key || props[k].name}]");
    }${EOL}`;
      }
      output += `    options.${props[k].name} = this.pick(req, '${props[k].definition.in}.${props[k].definition.key || props[k].name}', '${props[k].definition.type.name}', ${this.getDefaultValue(props[k].definition)});${EOL}`;

    }
    output += `    return new ${className}(options);${EOL}`;
    output += `  }${EOL}`;

    return output;
  }

  formatter(type) {
    switch (type) {
      case 'string':
        return `'' + `;
        break;
      case 'number':
        return `1 * `;
        break;
      default:
        return '';
        break;
    }
  }

  arrayDisplay(arr) {
    let output = ``;
    for (let k in arr) {
      output += ` ${k} -> ${arr[k]}  ,`;
    }
    return output;
  }

  typeMap(name) {
    switch (name) {
      case 'number':
      case 'float':
        return 'number';
        break;
      default:
        return name;
    }
  }
}

module.exports = ObjectRender;
