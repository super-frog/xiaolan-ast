const fs = require('fs');
const path = require('path');
const { EOL } = require('os');
const templateBank = require('../tpl/templateBank');
const py = require('../lib/pinyin');
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

    if (Object.keys(definition.enumSet).length) {
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

  listEnum(enumSet) {
    let content = `module.exports = ${JSON.stringify(enumSet, null, 2).replace(/"/g,'\'')};`;
    fs.writeFileSync(`${path.resolve(this.ouputPath)}/Enum.js`, content);
    console.log('File generated in : ' + `${path.resolve(this.ouputPath)}/Enum.js`);
  }

  pickFunc() {
    return `static pick(source, path, type=null, defaultValue=null, memberType=null){
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
      if(typeof tmp === 'object'){
        tmp = JSON.stringify(tmp);
      }else{
        tmp = decodeURIComponent(tmp.toString());
      }
      break;
    case 'number':
    case 'enum':
      tmp = 1*tmp;
      break;
    case 'array':
      if(typeof tmp === 'string'){
        tmp = tmp.split(',');
      }
      if (memberType === 'number') {
        let len = tmp.length;
        for (let i = 0; i < len; i++) {
          tmp[i] = 1 * tmp[i];
        }
      }
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
      output.push(`this.${props[k].name} = options.${props[k].name}${props[k].definition.requirement === true ? '' : ` || ${this.getDefaultValue(props[k].definition)}`};`);
    }
    return output;
  }

  getDefaultValue(fieldDefinition = {}) {
    let type = fieldDefinition.type ? fieldDefinition.type.name : 'string';
    switch (type) {
    case 'string':
      return `'${fieldDefinition.defaultValue || ''}'`;
    case 'enum':
    case 'number':
      return `${fieldDefinition.defaultValue || 0}`;
    case 'array':
      if (fieldDefinition.defaultValue.length) {
        return `['${fieldDefinition.defaultValue.join('\',\'')}']`;
      } else {
        return '[]';
      }
    case 'ref':
      return `new ${fieldDefinition.type.ref.name}({})`;
    }
  }

  enumFunc(field, enumSet) {
    return `get${py.camel(field, true)}(){
    return (${JSON.stringify(enumSet.options).replace(/"/g,'\'')})[this.${field}];
  }${EOL}`;
  }

  validateFunc() {
    let props = this.definition.props;
    let output = `validate(){${EOL}`;
    let refName ;
    for (let k in props) {
      if (props[k].ref !== undefined) {
        // nothing 
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
          output += `    if((${JSON.stringify(props[k].definition.type.options).replace(/"/g,'\'')})[this.${props[k].name}] === undefined){${EOL}`;
          output += `      throw new Error('type validate failed: [${props[k].name}]: ${props[k].name} can only choosing from ["${this.arrayDisplay(props[k].definition.type.options)}"]');${EOL}`;
          output += `    }${EOL}${EOL}`;
          break;
        case 'array':
          //{ name: 'number', range: [ 0, 100 ], memberRange: [ 1, 99999 ] }
          //{ name: 'string', length: [ 0, 100 ], memberLength: [ 1, 999 ] }
          //console.log(props[k].definition.type.member);process.exit(0);
          switch (props[k].definition.type.member.name) {
          case 'number':
            output += `    if(!(Array.isArray(this.${props[k].name}) && (this.${props[k].name}.length >= ${props[k].definition.type.member.range[0]} && this.${props[k].name}.length <= ${props[k].definition.type.member.range[1]}))){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: must be array of [${props[k].definition.type.member.name}]');${EOL}`;
            output += `    }${EOL}`;
            output += `    for (let k in this.${props[k].name}) {${EOL}`;
            output += `      if (!((typeof this.${props[k].name}[k] === 'number') && (this.${props[k].name}[k] >= ${props[k].definition.type.member.memberRange[0]}) && (this.${props[k].name}[k] <= ${props[k].definition.type.member.memberRange[1]}))){${EOL}`;
            output += `        throw new Error('type validate failed: [${props[k].name}]: must be array of [${props[k].definition.type.member.name}] in ${JSON.stringify(props[k].definition.type.member.memberRange)}');${EOL}`;
            output += `      }${EOL}`;
            output += `    }${EOL}${EOL}`;
            break;
          case 'string':
            output += `    if(!(Array.isArray(this.${props[k].name}) && (this.${props[k].name}.length >= ${props[k].definition.type.member.length[0]} && this.${props[k].name}.length <= ${props[k].definition.type.member.length[1]}))){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: must be array of [${props[k].definition.type.member.name}]');${EOL}`;
            output += `    }${EOL}`;
            output += `    for (let k in this.${props[k].name}) {${EOL}`;
            output += `      if (!((typeof this.${props[k].name}[k] === 'string') && (this.${props[k].name}[k].length >= ${props[k].definition.type.member.memberLength[0]}) && (this.${props[k].name}[k].length <= ${props[k].definition.type.member.memberLength[1]}))){${EOL}`;
            output += `        throw new Error('type validate failed: [${props[k].name}]: must be array of [${props[k].definition.type.member.name}] length in ${JSON.stringify(props[k].definition.type.member.memberRange)}');${EOL}`;
            output += `      }${EOL}`;
            output += `    }${EOL}${EOL}`;
            break;
          case 'enum':
            output += `    if(!(Array.isArray(this.${props[k].name}) && (this.${props[k].name}.length >= ${props[k].definition.type.member.length[0]} && this.${props[k].name}.length <= ${props[k].definition.type.member.length[1]}))){${EOL}`;
            output += `      throw new Error('type validate failed: [${props[k].name}]: must be array of [${props[k].definition.type.member.name}]');${EOL}`;
            output += `    }${EOL}`;
            output += `    for (let k in this.${props[k].name}) {${EOL}`;
            output += `      if (!((typeof this.${props[k].name}[k] === 'string') && (${JSON.stringify(Object.keys(props[k].definition.type.member.options))}.includes(this.${props[k].name}[k])))){${EOL}`;
            output += `        throw new Error('type validate failed: [${props[k].name}]: must be array of [${props[k].definition.type.member.name}] in ${JSON.stringify(Object.keys(props[k].definition.type.member.options))}');${EOL}`;
            output += `      }${EOL}`;
            output += `    }${EOL}${EOL}`;

            break;
          }
          break;
        case 'ref':
          refName = props[k].definition.type.ref.name;
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
      throw new Error('Requirement : [${props[k].definition.key || props[k].name}]');
    }${EOL}`;
      }

      output += `    options.${props[k].name} = this.pick(req, '${props[k].definition.in}.${props[k].definition.key || props[k].name}', '${props[k].definition.type.name}', ${this.getDefaultValue(props[k].definition)}${(props[k].definition.type.name === 'array' ? ', \'' + props[k].definition.type.member.name + '\'' : '')});${EOL}`;

    }
    output += `    return new ${className}(options);${EOL}`;
    output += `  }${EOL}`;

    return output;
  }

  formatter(type) {
    switch (type) {
    case 'string':
      return '\'\' + ';
    case 'number':
      return '1 * ';
    default:
      return '';
    }
  }

  arrayDisplay(arr) {
    let output = '';
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
    default:
      return name;
    }
  }
}

module.exports = ObjectRender;
