const BaseRender = require('./BaseRender');
const templateBank = require('../tpl/templateBank');
const { EOL } = require('os');
const py = require('../lib/pinyin');

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
    this.data._method_.push(this.tableName());
    this.data._method_.push(this.count());
    this.data._method_.push(this.toObj());
    this.data._method_.push(this.toRow());
    this.data._method_.push(this.validate());
    this.data._method_.push(this.save());
    this.data._method_.push(this.update());
    this.data._method_.push(this.create());

    this.data._depends_ = new Set();
    this.data._depends_.add('const Connection = require(\'xiaolan-db\').Connection(\'default\').conn;');
    this.data._depends_.add(`const TableName = '${this.definition.name}';`);
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

  tableName() {
    let output = [];
    output.push(`static table(){
    return TableName;
  }
  `);
    return output;
  }

  count() {
    let output = [];
    let countFunc = `static count(expression,where){
    let sql = 'select count('+expression+') from \`${this.definition.name}\` ';
    let conditions = [];
    let params = {};
    for(let k in where){
      conditions.push(' \`'+k+'\`=:'+k);
      params[k] = where[k];
    }
    if(conditions.length){
      sql += 'where '+conditions.join(' and ');
    }
    //@number
    return new Promise((resolved,rejected)=>{
      Connection.query({sql:sql,params:params}, (e,r)=>{
        if(e){
          rejected(e);
        }else{
          if(r[0]){
            resolved(r[0]['count('+expression+')']);
          }else{
            resolved(null);
          }
        }
      });
    });
  }
  `;
    output.push(countFunc);
    return output;
  }

  classConstructorBody() {
    let fieldSet = this.definition.fieldSet;
    let output = [];
    for (let k in fieldSet) {

      output.push(`this.${k} = (data.${k}||data.${fieldSet[k].fieldName})||${this.getDefaultValue(fieldSet[k])};`);
    }

    return output;
  }

  getDefaultValue(fieldDefinition) {
    let type = fieldDefinition.rules[0];
    switch (type) {
    case 'string':
      return `'${fieldDefinition.defaultValue || ''}'`;
    case 'enum':
    case 'number':
      return `${fieldDefinition.defaultValue || 0}`;
    case 'array':
      return `['${fieldDefinition.defaultValue.join('\',\'')}']`;
    case 'ref':
      return `new ${fieldDefinition.type.ref.name}({})`;
    default:
      return '\'\'';
    }
  }

  searchFunc() {
    let allowKey = new Set();
    let output = [];
    if (this.definition.primary.key) {
      allowKey.add(this.definition.primary.fieldName);
      let func = `static fetchBy${py.camel(this.definition.primary.key, true)}(v){${EOL}`;
      func += `    let sql = 'select * from \`${this.definition.name}\` where \`${this.definition.primary.fieldName}\`=:v limit 1';${EOL}`;
      func += `    //@row${EOL}`;
      func += `    return new Promise((resolved, rejected) => {
      Connection.query({sql:sql, params:{v:v}}, (e ,r)=>{
        if(e){
          rejected(e);
        }else{
          if(r[0]){
            resolved(new ${this.data._name_}(r[0]));
          }else{
            resolved(null);
          }
        }
      });
    });${EOL}`;
      func += `  }${EOL}`;
      output.push(func);
    }
    if (Object.keys(this.definition.index).length) {
      for (let k in this.definition.index) {
        let func = 'static fetchBy';
        let args = [];
        let where = [];
        let params = [];
        for (let i in this.definition.index[k]) {
          allowKey.add(this.definition.index[k][i].fieldName);
          func += `${py.camel(this.definition.index[k][i].key, true)}`;
          args.push(this.definition.index[k][i].key);
          where.push(`\`${this.definition.index[k][i].fieldName}\`=:${this.definition.index[k][i].key}`);
          params.push(`${this.definition.index[k][i].key}: ${this.definition.index[k][i].key}`);
        }
        args.push('page=1');
        args.push('pageSize=10');
        func += `(${args.join(', ')}){${EOL}`;
        func += `    let sql = 'select * from \`${this.definition.name}\` where ${where.join(' and ')} order by \`${this.definition.primary.fieldName}\` desc limit \'+((page-1)*pageSize)+\',\'+pageSize+\'';${EOL}`;
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
        output.push(func);
      }
    }
    if (Object.keys(this.definition.uniq).length) {
      for (let k in this.definition.uniq) {
        let func = 'static fetchBy';
        let args = [];
        let where = [];
        let params = [];
        for (let i in this.definition.uniq[k]) {
          allowKey.add(this.definition.uniq[k][i].fieldName);
          func += `${py.camel(this.definition.uniq[k][i].key, true)}`;
          args.push(this.definition.uniq[k][i].key);
          where.push(`\`${this.definition.uniq[k][i].fieldName}\`=:${this.definition.uniq[k][i].key}`);
          params.push(`${this.definition.uniq[k][i].key}: ${this.definition.uniq[k][i].key}`);
        }
        args.push('page=1');
        args.push('pageSize=10');
        func += `(${args.join(', ')}){${EOL}`;
        func += `    let sql = 'select * from \`${this.definition.name}\` where ${where.join(' and ')} order by \`${this.definition.primary.fieldName}\` desc limit \'+((page-1)*pageSize)+\',\'+pageSize+\'';${EOL}`;
        func += `    //@row${EOL}`;
        func += `    return new Promise((resolved, rejected) => {
      Connection.query({sql:sql, params:{${params.join(', ')}}}, (e ,r)=>{
        if(e){
          rejected(e);
        }else{
          if(r[0]){
            resolved(new ${this.data._name_}(r[0]));
          }else{
            resolved(null);
          }
        }
      });
    });${EOL}`;
        func += `  }${EOL}`;
        output.push(func);
      }
    }
    //fetchByAttr
    let fetchByAttr = `static fetchByAttr(data={}, page=1, pageSize=10){${EOL}`;
    fetchByAttr += `    let allowKey = ['${Array.from(allowKey).join('\',\'')}'];${EOL}`;
    fetchByAttr += `    let sql = 'select * from \`${this.definition.name}\` where 1 ';${EOL}`;
    fetchByAttr += `    if(Object.keys(data).length===0){
      throw new Error('data param required');
    }
    for(let k in data){
      let field = '';
      if(allowKey.includes(k)){
        field = k;
      }else if(allowKey.includes(KeyMap[k])){
        field = KeyMap[k];
      }else{
        throw new Error('Not Allow Fetching By [ "'+k+'" ]');
      }
      if (Array.isArray(data[k]) && data[k].length) {
        sql += ' and \`'+field+'\` in ("'+data[k].join('","')+'")';
      } else {
        sql += ' and \`'+field+'\`=:'+k+'';
      }
      
    }
    sql += ' order by \`${this.definition.primary.fieldName}\` desc limit '+((page-1)*pageSize)+','+pageSize;
    //@list
    return new Promise((resolved, rejected)=>{
      Connection.query({sql:sql,params:data}, (e, r)=>{
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
    });
  `;
    fetchByAttr += `}${EOL}`;
    output.push(fetchByAttr);

    let raw = `static raw(sql='',params={}, obj=true){
    if(!sql.includes('limit')){
      throw new Error('raw sql must with paging');
    }
    //@list
    return new Promise((resolved, rejected)=>{
      Connection.query({sql:sql,params:params}, (e, r)=>{
        if(e){
          rejected(e);
        }else{
          if (obj) {
            let result = [];
            for(let k in r) {
              result.push(new ${this.data._name_}(r[k]));
            }
            resolved(result);
          }else{
            resolved(r);
          }
        }
      });
    });
  }
    `;
    output.push(raw);
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
          output += `    if(this.${k} !== null && !(typeof this.${k}==='number' && this.${k}>=${fieldSet[k].rules[1]} && this.${k}<=${fieldSet[k].rules[2]})){${EOL}`;
          output += `      throw new Error('attribute ${k}(${fieldSet[k].fieldName}) must be a number in [${fieldSet[k].rules[1]},${fieldSet[k].rules[2]}]');${EOL}`;
          output += `    }${EOL}`;
          break;
        case 'string':
          output += `    if(this.${k} !== null && !(typeof this.${k}==='string' && this.${k}.length>=${fieldSet[k].rules[1]} && this.${k}.length<=${fieldSet[k].rules[2]})){${EOL}`;
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
    output += `      try{${EOL}`;
    output += `        this.validate();${EOL}`;
    output += `      }catch(e){${EOL}`;
    output += `        return Promise.resolve(Object.assign(error.BAD_REQUEST, {message: error.BAD_REQUEST.message+':'+e.message}));${EOL}`;
    output += `      }${EOL}`;
    output += `    }${EOL}`;
    output += `    //@true${EOL}`;
    output += `    return new Promise((resolved, rejected) => {${EOL}`;
    output += `      let data = this.data();${EOL}`;
    output += `      data.createTime = data.createTime||Number.parseInt(Date.now()/1000);${EOL}`;
    output += `      data.updateTime = data.updateTime||Number.parseInt(Date.now()/1000);${EOL}`;
    output += '      let sql = `insert into \\\`${TableName}\\\` set `;' + EOL;
    output += `      let fields = [];${EOL}`;
    output += `      for(let k in data){${EOL}`;
    if (this.definition.primary) {
      output += `        if(k==='${this.definition.primary.key}' || data[k]===null){${EOL}`;
      output += `          continue;${EOL}`;
      output += `        }${EOL}`;
    }
    output += '        fields.push(`\\\`${KeyMap[k]}\\\`=:${k}`);' + EOL;
    output += `      }${EOL}`;
    output += `      sql += fields.join(',');${EOL}`;

    output += `      Connection.query({sql: sql,params:data},(e, r) => {${EOL}`;
    output += `        if(e) {${EOL}`;
    output += `          rejected(e);${EOL}`;
    output += `        }else{${EOL}`;
    output += `          this.id = r.insertId;${EOL}`;
    output += `          this.createTime = data.createTime;${EOL}`;
    output += `          this.updateTime = data.updateTime;${EOL}`;
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
    output += '      let sql = `update \\\`${TableName}\\\` set `;' + EOL;
    output += `      let data = this.data();${EOL}`;
    output += `      data.updateTime = data.updateTime||Number.parseInt(Date.now()/1000);${EOL}`;
    output += `      let fields = [];${EOL}`;
    output += `      for(let k in data){${EOL}`;
    if (this.definition.primary) {
      output += `        if(k==='${this.definition.primary.key}' || data[k]===null){${EOL}`;
      output += `          continue;${EOL}`;
      output += `        }${EOL}`;
    }
    output += '        fields.push(`\\\`${KeyMap[k]}\\\`=:${k}`);' + EOL;
    output += `      }${EOL}`;
    output += `      sql += fields.join(',');${EOL}`;



    let primary = this.definition.primary.fieldName;
    output += '      sql += \' where \`' + primary + '\`=:' + this.definition.primary.key + '\';' + EOL;
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
    output += `    //@this${EOL}`;
    output += `    return new ${this.data._name_}(data);${EOL}`;
    output += `  }${EOL}`;
    return output;
  }
}

module.exports = ModelRender;