/**
 * Created by lanhao on 2017/9/13.
 */

'use strict';

const esprima = require('esprima');
const fs = require('fs');
const path = require('path');
const astObject = require('../lib/astObject');
const util = require('util');

class Scope {
  constructor(name, file, parent) {
    this.name = name;

    let ast;
    if (typeof file === 'string') {
      this.file = path.resolve(file);
      this.dir = path.dirname(this.file);
      try {
        ast = esprima.parseScript(fs.readFileSync(this.file).toString(), {
          attachComment: true,
        }).body;
      } catch (e) {
        console.log(this.file, e.message);
        process.exit(-1);
      }
    } else {
      ast = file;
      this.dir = '';
    }
    // if (name == 'Arrow1') {
    //   console.log(JSON.stringify(ast)); process.exit(0);
    // }
    this.desc = this.getDesc(ast) || name;

    this.def = {};
    this.var = {};
    this.ret = [];

    Object.defineProperty(this, 'parent', {
      writable: true,
    });
    this.parent = parent;
    if (parent) {
      this.def = Object.assign(this.def, this.parent.def);
    }
    Object.defineProperty(this, 'ast', {
      writable: true,
    });
    Object.defineProperty(this, 'AI', {
      writable: true,
    });
    this.AI = 1;
    this.ast = ast;

    this.run(ast);
  }

  run(ast) {

    for (let k in ast) {
      switch (ast[k].type) {
        case 'VariableDeclaration':
          this.variableDeclaration(ast[k]);
          break;
        case 'FunctionDeclaration':
          this.functionDeclaration(ast[k]);
          break;
        case 'ExpressionStatement':
          this.expressionStatement(ast[k]);
          break;
        case 'ReturnStatement':
          this.ret = this.ret.concat(this.returnStatement(ast[k]));
          break;
        case 'ClassDeclaration':
          this.def['@' + ast[k].id.name] = this.getClassStruct(ast[k]);
          break;
        case 'MethodDefinition':
          if (ast[k].key.name === 'constructor') {
            if (this.parent) {
              let tmpDef = {};
              for (let k in this.parent.def) {
                this.def[k] = this.def[k] || Object.assign({}, this.parent.def[k]);
              }
            }
          }
          this.def['@' + ast[k].key.name] = this.getMethodDef(ast[k]);
          break;
        case 'IfStatement':
          this.ifStatement(ast[k]);
          break;
        case 'WhileStatement':
          this.whileStatement(ast[k]);
          break;
        case 'ForStatement':

          this.forStatement(ast[k]);
          break;
      }

    }
  }

  astObjects() {
    let result = {};
    for (let k in this.ast) {
      let item = this.ast[k];
      if (item.type === 'VariableDeclaration') {
        result[item.declarations[0].id.name] = astObject(item.declarations[0].id.name, item.declarations[0].init.properties);
      }
    }
    return result;
  }

  // 获取第一行的面熟名字
  getDesc(body) {
    let firstLine = body[0];
    if (firstLine && firstLine.leadingComments && firstLine.leadingComments[0]) {
      return firstLine.leadingComments[0].value;
    } else {
      return null;
    }
  }

  //For
  forStatement(statement) {
    let scope = new Scope('while', statement.body.body, this);
    if (scope.ret.length) {
      this.ret = this.ret.concat(scope.ret);
    }
  }

  //处理while
  whileStatement(statement) {
    let scope = new Scope('while', statement.body.body, this);
    if (scope.ret.length) {
      this.ret = this.ret.concat(scope.ret);
    }
  }

  //处理IF结构
  ifStatement(statement) {
    let consequent = new Scope('consequent', statement.consequent.body, this);
    if (consequent.ret.length) {
      this.ret = this.ret.concat(consequent.ret);
    }
    if (statement.alternate) {
      if (statement.alternate.type === 'IfStatement') {
        this.ifStatement(statement.alternate);
      } else {
        let alternate = new Scope('alternate', statement.alternate.body, this);
        if (alternate.ret.length) {
          this.ret = this.ret.concat(alternate.ret);
        }
      }
    }
  }

  variableDeclaration(declaration) {
    let declarations = declaration.declarations;

    for (let k in declarations) {
      let declare = {};
      if (declarations[k].init) {
        switch (declarations[k].init.type) {
          case 'AwaitExpression':
            declare = this.getReturnStruct(declarations[k].init.argument, declarations[k].id.name);
            //todo
            if (typeof declare !== 'string') {
              this.def['@' + declarations[k].id.name] = declare;
            }
            break;
            break;
          case 'Literal':
            this.def['@' + declarations[k].id.name] = {
              type: typeof declarations[k].init.value,
              value: declarations[k].init.value,
            };
            declare = declarations[k].id.name;
            break;
          case 'ObjectExpression':
            this.def['@' + declarations[k].id.name] = {
              type: 'object',
              value: this.getObjectStruct(declarations[k].init.properties)
            };
            declare = declarations[k].id.name;
            break;
          case 'CallExpression':
            declare = this.getReturnStruct(declarations[k].init, declarations[k].id.name);

            if (typeof declare !== 'string') {
              this.def['@' + declarations[k].id.name] = declare;
            }
            break;
          case 'Identifier':
            declare = this.getIdentifierDef(declarations[k].init.name);
            break;
          case 'ArrowFunctionExpression':
            declarations[k].init.id = {
              type: 'Identifier',
              name: declarations[k].id.name,
            };

            declare = this.functionDeclaration(declarations[k].init);
            break;
          case 'ArrayExpression':
            declare = {
              type: 'array',
              elements: declarations[k].init.elements[0] ? typeof declarations[k].init.elements[0].value : 'unknown',
            };
            break;
          case 'BinaryExpression':

            break;
        }
      }
      declare && (this.var[declarations[k].id.name] = declare);
    }
  }

  functionDeclaration(declaration) {
    this.def['@' + declaration.id.name] = this.getFuncDef(declaration.id.name, declaration);
  }

  //专门处理返回语句
  returnStatement(stat) {
    if (stat.leadingComments && stat.leadingComments[0] && ['@row', '@list', '@true', '@this'].includes(stat.leadingComments[0].value)) {
      if (stat.leadingComments[0].value === '@row') {
        return this.getClassRet(this.parent);
      } else if (stat.leadingComments[0].value === '@list') {
        return {
          type: 'array',
          value: this.getClassRet(this.parent),
        };
      } else if (stat.leadingComments[0].value === '@true') {
        return {
          type: 'Literal',
          value: true
        };
      } else if (stat.leadingComments[0].value === '@this') {
        return this.parent.parent.name;
      }
    }

    switch (stat.argument.type) {
      case 'ArrayExpression':
        return {
          type: 'array',
          value: stat.argument.elements[0] ? this.returnStatement({ argument: stat.argument.elements[0] }) : 'unknown',
        };
        break;
      case 'NewExpression':
        return this.getIdentifierDef(stat.argument.callee.name);
        break;
      case 'Identifier':

        return this.getDefStruct(this.getIdentifierDef(stat.argument.name));

      case 'Literal':
        return this.getValueStruct(stat.argument);
        break;
      case 'MemberExpression':
        let id;
        let [object, property] = [stat.argument.object.type === 'ThisExpression' ? 'this' : stat.argument.object.name, stat.argument.property.name];

        if (object === 'this') {
          id = property;
        } else {
          id = `${stat.argument.object.name}.${stat.argument.property.name}`;
        }


        if (this.parent.def['@' + object] && this.parent.def['@' + object].type === 'module') {
          //this.def['@' + id] = this.parent.def['@' + object].scope.def['@' + property].scope.ret || {};
        } else {
          this.def['@' + id] = {
            type: 'unknown',
            value: id
          };
        }
        return this.def['@' + id];
        break;
      case 'CallExpression':
        return this.getCalleeStruct(stat.argument.callee, stat.argument.arguments);
        break;
      case 'AssignmentExpression':
        let right = stat.argument.right;
        return this.returnStatement(right);
        break;
      case 'ObjectExpression':
        let obj = {
          type: 'object',
          value: {}
        };
        for (let k in stat.argument.properties) {
          obj.value[stat.argument.properties[k].key.name] = {
            name: stat.argument.properties[k].key.name,
            type: typeof stat.argument.properties[k].value.value
          };
        }
        return obj;
        break;
      default:
        return {
          type: 'unknown',
          value: null,
        };
        break;
    }
  }

  getClassStruct(classDeclare) {
    let scope = new Scope(classDeclare.id.name, classDeclare.body.body, this);
    scope.dir = this.dir;
    scope.file = this.file;
    let tmpDef = {};
    scope.ret = this.getClassRet(scope);
    scope.def['@' + classDeclare.id.name] = scope.ret;
    return {
      type: 'class',
      scope: scope,
    };
  }

  //根据class的def来计算class的结构
  getClassRet(scope) {
    let result = {};
    for (let k in scope.var) {
      result[k] = scope.def['@' + scope.var[k]];
    }
    return {
      type: 'object',
      value: result
    };
  }

  //当一个scope是一个函数体时,需要调用此方法在内部模拟声明参数变量
  insertArgs(args) {
    for (let k in args) {
      this.def['@' + args[k]] = {
        value: '',
        type: '',
      };
    }
  }

  expressionStatement(expression) {

    switch (expression.expression.type) {
      case 'CallExpression':
        return this.getReturnStruct(expression.expression);
        break;
      case 'AssignmentExpression':
        if (this.isExportExpression(expression.expression)) {
          expression.expression.right.exports = true;
          this.ret = this.ret.concat(this.getRightStruct(expression.expression.right));
        } else if (this.isThisExpression(expression.expression)) {
          this.def['@' + expression.expression.left.property.name] = this.getRightStruct(expression.expression.right);
          this.var[expression.expression.left.property.name] = expression.expression.left.property.name;
          if (this.parent) {
            this.parent.def['@' + expression.expression.left.property.name] = this.def['@' + expression.expression.left.property.name];
            this.parent.var[expression.expression.left.property.name] = expression.expression.left.property.name;
          }
        } else {

          let _tmp = this.def['@' + this.memberExpressionLeftName(expression.expression.left)] = this.getRightStruct(expression.expression.right);

          if (expression.expression.left.type === 'MemberExpression' && this.def['@' + expression.expression.left.object.name] && this.def['@' + expression.expression.left.object.name].type === 'object') {
            let append = {};
            append[expression.expression.left.property.name] = _tmp;
            Object.assign(this.def['@' + expression.expression.left.object.name].value, append);
          } else if (expression.expression.left.type === 'MemberExpression' && this.def['@' + expression.expression.left.object.name] && this.def['@' + expression.expression.left.object.name].type === 'array') {
            console.log(`${this.file || this.parent.file}: 不允许往数组结构追加属性!`); process.exit(0);
          }

          this.var[expression.expression.left.name] = expression.expression.left.name;
        }

        break;
    }
  }

  memberExpressionLeftName(left) {
    switch (left.type) {
      case 'Identifier':
        return left.name;
        break;
      case 'MemberExpression':
        return this.memberExpressionLeftName(left.object) + '.' + left.property.name;
        break;
      case 'CallExpression':
        return this.memberExpressionLeftName(left.callee);
        break;
    }
  }

  getCalleeStruct(callee, args = {}) {

    switch (callee.type) {
      case 'MemberExpression':
        let object = this.getDefStruct(this.memberExpressionLeftName(callee.object));
        if (!object) {
          if (this.memberExpressionLeftName(callee.object).startsWith('error')) {
            if (callee.property.name === 'withMessage') {
              return {
                type: 'unknown',
                value: this.memberExpressionLeftName(callee.object),
                msg: args[0] ? args[0].value : '',
              };
            }
          }
          //todo 暂时忽视这个问题
          return {
            type: 'unknown'
          };
        }

        let innerScope = object.scope.scope;
        let method = innerScope.def['@' + callee.property.name];
        return method.scope.ret[0];
        break;

      default:
        if (this.def['@' + right.callee.name]) {
          return this.getDefStruct(right.callee.name);
        }
        return {
          type: 'Identify',
          value: right.callee.name
        };
        break;
    }
  }

  getRightStruct(right) {
    let result = {};
    switch (right.type) {
      case 'ArrowFunctionExpression':
        right.id = {
          type: 'Identifier',
          name: 'Arrow' + (this.AI++),
        };

        this.functionDeclaration(right);

        return this.getDefStruct(this.getIdentifierDef(right.id.name));
        break;

      case 'LogicalExpression':
        return this.getLogicalStruct(right);
        break;
      case 'Literal':
        result = {
          type: 'Literal',
          value: {
            type: typeof right.value,
            value: right.value,
          },
        };
        return result;
        break;
      case 'CallExpression':
        return this.getCalleeStruct(right.callee, right.arguments);
        break;
      case 'ArrayExpression':
        return {
          type: 'array',
          elements: right.elements[0] ? typeof right.elements[0].value : 'unknown',
        };
        break;
      case 'NewExpression':
        return (this.parent.def ? this.parent.getDefStruct(this.getIdentifierDef(right.callee.name)) : null) || this.getIdentifierDef(right.callee.name);
        break;
      case 'Identifier':
        this.def['@' + this.getIdentifierDef(right.name)].exports = right.exports;
        return this.getDefStruct(this.getIdentifierDef(right.name));
        break;
      case 'ObjectExpression':
        for (let k in right.properties) {
          let property = right.properties[k];
          result[property.key.name] = {
            type: typeof property.value.value,
            value: property.value.value,
          };
        }
        return {
          type: 'object',
          value: result
        };
        break;
    }
  }

  //从当前scope的定义里获取定义的返回结构
  getDefStruct(name) {

    if (typeof name !== 'string') {
      return name;
    }
    let struct = this.def['@' + name] || (this.parent ? this.parent.getDefStruct(name) : null);

    return struct;
  }

  //根据类型得到字段定义
  getValueStruct(v) {
    switch (v.type) {
      case 'Literal':
        return {
          type: typeof v.value,
          value: v.value,
        };
        break;
    }
  }

  getLogicalStruct(expression) {
    return this.getRightStruct(expression.right);
  }

  isExportExpression(expression) {
    return expression.operator === '='
      && expression.left.type === 'MemberExpression'
      && expression.left.object.name === 'module'
      && expression.left.property.name === 'exports';
  }

  isThisExpression(expression) {
    return expression.operator === '='
      && expression.left.type === 'MemberExpression'
      && expression.left.object.type === 'ThisExpression';
  }


  getIdentifierDef(name) {
    while (this.var[name] && (this.var[name] != name)) {
      name = this.var[name];
    }

    if (this.parent && this.parent.def && this.parent.def['@' + name]) {

      this.def['@' + name] = Object.assign({}, this.parent.getDefStruct(name), this.getDefStruct(name));
    }

    return name;
  }

  getObjectStruct(props) {
    let result = {};
    for (let k in props) {
      result[props[k].key.name] = {
        type:'Literal',
        value:{
          type: this.getMemberExpressionType(props[k].value),
          value: props[k].value.value,
        }
      };
     
    }

    return result;
  }

  getMemberExpressionType(expression) {
    switch (expression.type) {
      case 'MemberExpression':
        if(expression.object&&this.def['@'+expression.object.name] && this.def['@'+expression.object.name].type === 'object'){
          if(this.def['@'+expression.object.name].value && this.def['@'+expression.object.name].value[expression.property.name]){
            return this.def['@'+expression.object.name].value[expression.property.name].value.type;
          }else{
            return 'unknown';  
          }
        }else{
          return 'unknown';
        }
        break;
      default:
        return expression.value?typeof expression.value:'unknown';
        break;
    }

  }

  //处理调用语句的返回结构
  getReturnStruct(callExpression, name) {
    switch (callExpression.callee.type) {
      case 'Identifier':
        if (callExpression.callee.name === 'require') {

          let file = this.resolvedFile(callExpression.arguments[0].value);
          //当resolved结果跟原来一样,表示是一个核心模块,可以忽略
          if (file === callExpression.arguments[0].value) {
            return null;
          }
          let scope = new Scope(name, file, this);

          if (scope.ret[0].type === 'class') {
            this.def['@' + scope.ret[0].scope.name] = {
              type: 'module',
              scope: scope.ret[0],
            };
            this.def['@' + name] = {
              type: 'module',
              scope: scope.ret[0],
            };
          } else {
            this.def['@' + name] = {
              type: 'module',
              scope: scope.ret[0],
            };
          }

          return name;

        } else if (callExpression.callee.name && this.def['@' + callExpression.callee.name]) {
          let args = {};
          for (let k in this.def['@' + callExpression.callee.name].args) {
            if (callExpression.arguments[k].type === 'Identifier' && this.def['@' + callExpression.arguments[k].name]) {
              args[this.def['@' + callExpression.callee.name].args[k]] = this.def['@' + callExpression.arguments[k].name];
            } else {
              args[this.def['@' + callExpression.callee.name].args[k]] = {
                value: callExpression.arguments[k].value,
                type: typeof callExpression.arguments[k].value,
              };
            }
          }

        }
        break;
      case 'MemberExpression':
        let id;
        let [object, property] = [callExpression.callee.object.type === 'ThisExpression' ? 'this' : callExpression.callee.object.name, callExpression.callee.property.name];

        if (object === 'this') {
          id = property;
        } else {
          id = `${callExpression.callee.object.name}.${callExpression.callee.property.name}`;
        }

        if (this.parent && this.parent.def['@' + object] && this.parent.def['@' + object].type === 'module') {
          this.def['@' + id] = this.parent.getDefStruct(this.parent.def['@' + object].scope.scope.def['@' + property].scope.ret[0]) || {};
        }
        return this.def['@' + id];
        break;
    }
  }

  getMethodDef(def) {
    let result = {};
    result = Object.assign(result, this.getFuncDef(def.key.name, def.value))
    result['type'] = def.kind;
    result['static'] = def.static;
    return result;
  }

  getFuncDef(name, def) {

    let result = {};
    result['exports'] = def.exports;
    result['type'] = 'func';
    result['args'] = [];
    for (let k in def.params) {
      result['args'].push(def.params[k].name || def.params[k].left.name);
    }
    result['scope'] = new Scope(name, def.body.body, this);

    result['scope'].dir = this.dir;
    result['scope'].file = this.file;
    result['scope'].insertArgs(result['args']);
    return result;
  }

  resolvedFile(file) {
    let realPath;
    if (file.endsWith('.js') || file.endsWith('.json')) {
      realPath = path.resolve(this.dir + '/' + file);
    } else {
      realPath = path.resolve(this.dir + '/' + file + '.js');
    }
    if (fs.existsSync(realPath)) {
      return realPath;
    } else {
      return require.resolve(file);
    }
  }

}

module.exports = Scope;