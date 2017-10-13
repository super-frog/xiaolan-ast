/**
 * Created by lanhao on 2017/9/17.
 */

'use strict';
const BaseRender = require('./BaseRender');
const templateBank = require('../tpl/templateBank');
const EOL = require('os').EOL;
const py = require('frog-lib').pinyin;

class ModelRender extends BaseRender {
  constructor(definition, output) {
    super(definition);
    this.definition = definition;
    this.ouputPath = output;
    this.data._name_ = py.camel(definition.name, true);
    this.data._fieldmap_ = this.fieldMap();
    this.data._keymap_ = this.keyMap();
    this.data._init_ = this.classConstructorBody();
    this.data._validate_ = '';
    this.data._method_ = [];
    this.data._method_ = this.searchFunc();
    this.data._method_.push(this.toObj());
    this.data._method_.push(this.toRow());
    this.data._method_.push(this.validate());
    this.data._method_.push(this.save());
    this.data._method_.push(this.update());
    this.data._method_.push(this.create());

    this.data._depends_ = new Set();
    this.data._depends_.add(`const Connection = require('xiaolan-db').Connection('default').conn;`);
    this.data._depends_.add(`const TableName = "${this.definition.name}";`);
    this.data._depends_ = Array.from(this.data._depends_);
    let tpl = templateBank('ModelClass').split(EOL);
    for (let k in tpl) {
      let tokens = this.findToken(tpl[k]);
      if (tokens) {
        for (let i in tokens) {
          this.output = this.output.concat(this.renderLine(tpl[k], tokens[i], this.data[tokens[i]] || ''));
        }
      } else {
        this.output.push(tpl[k]);
      }
    }
  }

  classConstructorBody() {
    let fieldSet = this.definition.fieldSet;
    let output = [];
    for (let k in fieldSet) {

      output.push(`this.${k} = (data.${k}||data.${fieldSet[k].fieldName})||'';`);
    }

    return output;
  }

  searchFunc() {
    let output = [];
    if (this.definition.primary.key) {
      let func = `static fetchBy${py.camel(this.definition.primary.key, true)}(v){${EOL}`;
      func += `    let sql = 'select * from ${this.definition.name} where ${this.definition.primary.fieldName}=:v limit 1';${EOL}`;
      func += `    //@row${EOL}`;
      func += `    return new Promise((resolved, rejected) => {
      Connection.query({sql:sql, params:{v:v}}, (e ,r)=>{
        if(e){
          rejected(e);
        }else{
          resolved(new ${this.data._name_}(r[0]));
        }
      });
    });${EOL}`;
      func += `  }${EOL}`;
      output.push(func);
    }
    if (Object.keys(this.definition.index).length) {
      for (let k in this.definition.index) {
        let func = `static fetchBy`;
        let args = [];
        let where = [];
        let params = [];
        for (let i in this.definition.index[k]) {
          func += `${py.camel(this.definition.index[k][i].key, true)}`;
          args.push(this.definition.index[k][i].key);
          where.push(`${this.definition.index[k][i].fieldName}=:${this.definition.index[k][i].key}`);
          params.push(`${this.definition.index[k][i].key}: ${this.definition.index[k][i].key}`);
        }
        args.push(`page=1`);
        args.push(`pageSize=10`);
        func += `(${args.join(', ')}){${EOL}`;
        func += `    let sql = 'select * from ${this.definition.name} where ${where.join(' and ')} order by ${this.definition.primary.fieldName} desc limit \'+((page-1)*pageSize)+\',\'+pageSize+\'';${EOL}`;
        func += `    //@list${EOL}`;
        func += `    return new Promise((resolved, rejected) => {
      Connection.query({sql:sql, params:{${params.join(', ')}}}, (e ,r)=>{
        if(e){
          rejected(e);
        }else{
          let result = [];
          for(let k in r) {
            result.push(new ${this.data._name_}(r[k]));
          }
          resolved(result);
        }
      });
    });${EOL}`;
        func += `  }${EOL}`;
        output.push(func)
      }
    }
    if (Object.keys(this.definition.uniq).length) {
      for (let k in this.definition.uniq) {
        let func = `static fetchBy`;
        let args = [];
        let where = [];
        let params = [];
        for (let i in this.definition.uniq[k]) {
          func += `${py.camel(this.definition.uniq[k][i].key, true)}`;
          args.push(this.definition.uniq[k][i].key);
          where.push(`${this.definition.uniq[k][i].fieldName}=:${this.definition.uniq[k][i].key}`);
          params.push(`${this.definition.uniq[k][i].key}: ${this.definition.uniq[k][i].key}`);
        }
        args.push(`page=1`);
        args.push(`pageSize=10`);
        func += `(${args.join(', ')}){${EOL}`;
        func += `    let sql = 'select * from ${this.definition.name} where ${where.join(' and ')} order by ${this.definition.primary.fieldName} desc limit \'+((page-1)*pageSize)+\',\'+pageSize+\'';${EOL}`;
        func += `    //@row${EOL}`;
        func += `    return new Promise((resolved, rejected) => {
      Connection.query({sql:sql, params:{${params.join(', ')}}}, (e ,r)=>{
        if(e){
          rejected(e);
        }else{
          resolved(new ${this.data._name_}(r[0]));
        }
      });
    });${EOL}`;
        func += `  }${EOL}`;
        output.push(func)
      }
    }
    return output;
  }

  keyMap() {
    let output = `const KeyMap = {${EOL}`;
    let fieldSet = this.definition.fieldSet;
    for (let k in fieldSet) {
      output += `  ${k}: '${fieldSet[k].fieldName}',${EOL}`;
    }
    output += `};${EOL}`;
    return output;
  }

  fieldMap() {
    let output = `const FieldMap = {${EOL}`;
    let fieldSet = this.definition.fieldSet;
    for (let k in fieldSet) {
      output += `  ${fieldSet[k].fieldName}: '${k}',${EOL}`;
    }
    output += `};${EOL}`;
    return output;
  }

  toObj() {
    let output = `data(){${EOL}`;
    output += `    let obj = {};${EOL}`;
    output += `    for(let k in FieldMap){${EOL}`;
    output += `      obj[FieldMap[k]] = this[FieldMap[k]];${EOL}`;
    output += `    }${EOL}`;
    output += `    return obj;${EOL}`;
    output += `  }${EOL}`;
    return output;
  }

  toRow() {
    let output = `row(){${EOL}`;
    output += `    let row = {};${EOL}`;
    output += `    for(let k in FieldMap){${EOL}`;
    output += `      row[k] = this[FieldMap[k]];${EOL}`;
    output += `    }${EOL}`;
    output += `    return row;${EOL}`;
    output += `  }${EOL}`;
    return output;
  }

  validate() {
    let fieldSet = this.definition.fieldSet;
    let output = `validate(){${EOL}`;
    for (let k in fieldSet) {
      if (fieldSet[k].rules.length > 0 && !fieldSet[k].autoIncrease) {
        switch (fieldSet[k].rules[0]) {
          case 'number':
            output += `    if(!(typeof this.${k}==='number' && this.${k}>=${fieldSet[k].rules[1]} && this.${k}<=${fieldSet[k].rules[2]})){${EOL}`;
            output += `      throw new Error('attribute ${k}(${fieldSet[k].fieldName}) must be a number in [${fieldSet[k].rules[1]},${fieldSet[k].rules[2]}]');${EOL}`;
            output += `    }${EOL}`;
            break;
          case 'string':
            output += `    if(!(typeof this.${k}==='string' && this.${k}.length>=${fieldSet[k].rules[1]} && this.${k}.length<=${fieldSet[k].rules[2]})){${EOL}`;
            output += `      throw new Error('attribute ${k}(${fieldSet[k].fieldName}) must be a string length in [${fieldSet[k].rules[1]},${fieldSet[k].rules[2]}]');${EOL}`;
            output += `    }${EOL}`;
            break;
        }
      }
    }
    output += `  }${EOL}`;
    return output;
  }

  save() {
    let output = `save(force=false){${EOL}`;
    output += `    if(force){${EOL}`;
    output += `      this.validate();${EOL}`;
    output += `    }${EOL}`;
    output += `    //@true${EOL}`;
    output += `    return new Promise((resolved, rejected) => {${EOL}`;
    output += '      let sql = `insert into ${TableName} set ';
    let fieldSet = this.definition.fieldSet;
    for (let k in fieldSet) {
      if (fieldSet[k].autoIncrease === true) {
        continue;
      }
      output += `${fieldSet[k].fieldName}=:${k},`;
    }
    output = output.substr(0, output.length - 1);
    output += '`;' + EOL;
    output += `      Connection.query({sql: sql,params:this.data()},(e, r) => {${EOL}`;
    output += `        if(e) {${EOL}`;
    output += `          rejected(e);${EOL}`;
    output += `        }else{${EOL}`;
    output += `          resolved(true);${EOL}`;
    output += `        }${EOL}`;
    output += `      });${EOL}`;
    output += `    });${EOL}`;
    output += `  }${EOL}`;
    return output;
  }

  update() {
    let output = `update(force=false){${EOL}`;
    output += `    if(force){${EOL}`;
    output += `      this.validate();${EOL}`;
    output += `    }${EOL}`;
    output += `    //@true${EOL}`;
    output += `    return new Promise((resolved, rejected) => {${EOL}`;
    output += '      let sql = `update ${TableName} set ';
    let fieldSet = this.definition.fieldSet;
    let values = [];
    for (let k in fieldSet) {
      if (fieldSet[k].autoIncrease === true) {
        continue;
      }
      values.push(`${fieldSet[k].fieldName}=:${k}`)
    }
    output += values.join(',');
    let primary = this.definition.primary.fieldName;
    output += ' where ' + primary + '=\'${this.' + this.definition.primary.key + '}\'`;' + EOL;
    output += `      let data = this.data();${EOL}`;
    output += `      delete data.${this.definition.primary.key};${EOL}`;
    output += `      Connection.query({sql: sql,params:data},(e, r) => {${EOL}`;
    output += `        if(e) {${EOL}`;
    output += `          rejected(e);${EOL}`;
    output += `        }else{${EOL}`;
    output += `          resolved(true);${EOL}`;
    output += `        }${EOL}`;
    output += `      });${EOL}`;
    output += `    });${EOL}`;
    output += `  }${EOL}`;
    return output;
  }

  create() {
    let output = `static create(data){${EOL}`;
    output += `    return new ${this.data._name_}(data);${EOL}`;
    output += `  }${EOL}`;
    return output;
  }
}

module.exports = ModelRender;