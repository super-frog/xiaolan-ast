/**
 * Created by lanhao on 2017/9/22.
 */

'use strict';
const colors = require('colors');
const EOL = require('os').EOL;
const fs = require('fs');
const RouterHandler = require('./RouteDefinition');
const Scope = require('./Scope');
const astObject = require('../lib/astObject');
const XiaolanError = require('xiaolan/lib/error').XiaolanError;


class JsocDriver {
  constructor(projectRoot, specHost = '') {
    this.host = specHost;
    this.projectRoot = projectRoot;
    this.errors = {};
    this.apis = {};
    this.loadErrorDefinitions();
    this.scan();
    delete this.projectRoot;
    this.mergeJsoc();
    fs.writeFileSync(process.cwd() + '/jsoc.json', JSON.stringify(this, null, 2));
    console.log('File generated in : ' + process.cwd() + '/jsoc.json');
  }

  scan() {
    if (!fs.existsSync(`${this.projectRoot}/routes.js`)) {
      console.log(`can not found routes.js${EOL}`.red);
      process.exit(-1);
    }
    let routes = require(`${this.projectRoot}/routes.js`);
    routes = this.routing(routes.map());

    for (let k in routes) {
      let scopes = [];
      let returns = [];

      for (let i in routes[k].handlers) {
        let handler = `${this.projectRoot}/handlers/${routes[k].handlers[i]}.js`;
        scopes = scopes.concat(new Scope(routes[k].handlers[i], handler));
        let _tmp = this.fattenReturn(scopes[scopes.length - 1].ret);
        if (i < (routes[k].handlers.length - 1)) {
          //去掉返回true的中间件
          let filter = [];
          for (let i in _tmp) {
            if (_tmp[i].value === true) {
              continue;
            }
            filter.push(_tmp[i]);
          }
          _tmp = filter;
        }
        if (_tmp.length) {
          returns = returns.concat(_tmp);
        }

      }

      let jsocResponse = {
        success: [],
        failed: []
      };

      for (let k in returns) {
        returns[k] = this.formatReturn(returns[k]);

        if (returns[k].code === undefined) {
          returns[k] = {
            code: 200,
            data: returns[k],
            message: ''
          };

          jsocResponse.success.push(this.jsocResponse(returns[k]));
        } else {
          jsocResponse.failed.push(returns[k]);
        }
      }
      
      let request = this.jsocRequest(scopes, routes[k]);

      let finalScope = scopes[scopes.length - 1];
      this.apis[finalScope.name] = {
        name: finalScope.name,
        desc: finalScope.desc,
        group: '',
        request,
        response: {
          body: jsocResponse
        }
      };
    }

  }

  fattenReturn(ret) {

    let result = [];

    for (let k in ret) {
      if (ret[k] === null) {
        result.push({
          type: 'NOT_SURE'
        });
        continue;
      }
      switch (ret[k].type) {
        case 'func':
          result = result.concat(this.fattenReturn(ret[k].scope.ret));
          break;

        default:
          result.push(ret[k]);
          break;
      }
    }
    return result;
  }

  jsocRequest(scopes, route) {
    let result = {};
    result.method = route.method;
    result.path = route.path;
    result.query = {};
    result.params = {};
    result.body = {};

    let scopeNum = scopes.length;
    for (let i = 0; i < scopeNum; i++) {

      let scope = scopes[i];
      let astObjects = scope.astObjects();

      let requestObj = null;
      for (let k in scope.def) {
        if (scope.def[k] && scope.def[k].exports === true) {
          requestObj = scope.def[k].args;
          break;
        }
      }

      for (let k in requestObj) {
        let objectDefinition = astObjects[requestObj[k]] || null;
        if (objectDefinition === null) {
          continue;
        }
        for (let i in objectDefinition.props) {
          let ins = objectDefinition.props[i].definition.in.split('.');

          let _node = result;
          while (ins.length > 0) {
            let _k = ins.shift();
            _node[_k] = _node[_k] || {};
            _node = _node[_k];
          }
          if (objectDefinition.props[i].definition.key) {
            _node[objectDefinition.props[i].definition.key] = _node[objectDefinition.props[i].definition.key] || {};
            _node = _node[objectDefinition.props[i].definition.key];
          } else {
            _node[i] = _node[i] || {};
            _node = _node[i];
          }

          _node._type = objectDefinition.props[i].definition.type.name;
          _node._default = objectDefinition.props[i].definition.defaultValue;
          _node._desc = [objectDefinition.props[i].definition.comment, objectDefinition.props[i].definition.description].join(' ');
          if (_node._type === 'enum') {
            _node._options = objectDefinition.props[i].definition.type.options;
          }
          if (objectDefinition.props[i].definition.type.length) {
            _node._length = objectDefinition.props[i].definition.type.length;
          }
          if (objectDefinition.props[i].definition.type.range) {
            _node._range = objectDefinition.props[i].definition.type.range;
          }
          if (objectDefinition.props[i].definition.type.member) {

            if (objectDefinition.props[i].definition.type.member.range) {
              _node._array_length = objectDefinition.props[i].definition.type.member.range;
            }
            if (objectDefinition.props[i].definition.type.member.length) {
              _node._array_length = objectDefinition.props[i].definition.type.member.length;
            }

            if (objectDefinition.props[i].definition.type.member.memberRange) {
              _node._member_range = objectDefinition.props[i].definition.type.member.memberRange;
              _node._member_type = 'number';
            }
            if (objectDefinition.props[i].definition.type.member.memberLength) {
              _node._member_length = objectDefinition.props[i].definition.type.member.memberLength;
              _node._member_type = 'string';
            }
            if (objectDefinition.props[i].definition.type.member.options) {
              _node._member_options = objectDefinition.props[i].definition.type.member.options;
              _node._member_type = 'enum';
            }
          }
        }
      }
    }
    return result;
  }

  jsocResponse(ret) {
    let result = {};
    result.code = {
      _type: typeof ret.code,
      _assert: ret.code,
    };

    if (Array.isArray(ret.data)) {
      result.data = [];
      if (ret.data.length) {

        let tmp = {};
        for (let k in ret.data[0]) {
          tmp[k] = {
            _type: ret.data[0][k],
          };
        }
        result.data.push(tmp);
      }

    } else if (typeof ret.data === 'object' && ret.data !== null) {
      result.data = {};
      for (let k in ret.data) {
        if (Array.isArray(ret.data[k])) {
          result.data[k] = [];
          let tmp = {};
          for(let i in ret.data[k][0]){
            tmp[i] = ret.data[k][0][i];
          }
          result.data[k].push(tmp);
        } else {
          result.data[k] = {
            _type: ret.data[k]
          };
        }
      }
    } else {
      result.data = {
        _type: typeof ret.data,
      };
    }

    result.message = {
      _type: typeof ret.message,
    };

    return result;
  }

  loadErrorDefinitions() {
    if (!fs.existsSync(`${this.projectRoot}/definitions/errors/Error.gen.js`)) {
      console.log(`can not found definitions/errors/Error.gen.js${EOL}`.red);
      process.exit(-1);
    }
    let errorDefinitions = require(`${this.projectRoot}/definitions/errors/Error.gen.js`);
    for (let k in errorDefinitions) {
      this.errors['error.' + errorDefinitions[k].name] = (new XiaolanError(errorDefinitions[k])).obj();
    }
    this.errors['error.INTERNAL_ERROR'] = (new XiaolanError({
      code: -1,
      httpStatus: 500,
      message: 'Internal Error',
      name: 'INTERNAL_ERROR',
    })).obj();
    this.errors['error.BAD_REQUEST'] = (new XiaolanError({
      name: 'BAD_REQUEST',
      httpStatus: 400,
      code: -2,
      message: '入参检测错误',
    })).obj();
    this.errors['error.NOT_FOUND'] = (new XiaolanError({
      name: 'NOT_FOUND',
      httpStatus: 404,
      code: -3,
      message: 'not found',
    })).obj();
  }

  formatReturn(ret) {
    let result = {};
    switch (ret.type) {
      case 'func':

        break;
      case 'unknown':
      case 'NOT_SURE':
        result = this.errors[ret.value];
        if (result) {
          result.message = (result.message || '') + (ret.msg || '');
        } else {
          result = (new XiaolanError({
            code: -1,
            httpStatus: 500,
            message: 'Internal Error: not defined',
            name: 'INTERNAL_ERROR',
          })).obj();
        }
        break;
      case 'object':
        for (let k in ret.value) {
          if (ret.value[k].type === 'array') {
            result[k] = this.formatReturn(ret.value[k]);
          } else {
            result[k] = ((ret.value[k] && ret.value[k].value) ? ret.value[k].value.type : 'NOT_SURE');
          }
        }
        break;
      case 'array':
        result = [this.formatReturn(ret.value)];
        break;
      case 'Literal':
        result = ret.value;
        break;
      case 'module':
        result = this.formatReturn(ret.scope);
        break;
      case 'class':
        result = this.formatReturn(ret.scope.ret);
        break;
    }
    return result;
  }

  routing(routes) {
    let result = {};
    for (let k in routes) {
      let [method, path] = k.split(' ');
      result[routes[k].handler] = {
        method,
        path,
        handlers: [...routes[k].middleware, routes[k].handler]
      };
    }
    return result;
  }

  mergeJsoc() {
    if (fs.existsSync(`${process.cwd()}/jsoc.json`)) {
      let oldJsoc = require(`${process.cwd()}/jsoc.json`);
      for (let k in this.apis) {
        if (oldJsoc.apis[k] === undefined) {
          continue;
        }
        let success = this.apis[k].response.body.success;
        let successOld = null;
        try {
          successOld = oldJsoc.apis[k].response.body.success;
        } catch (e) {
          console.log('Bad old jsoc.json ! removed it first!'.red); process.exit(0);
        }
        for (let i in success) {
          this.mergeRes(success[i], successOld[i]);
        }
      }
    }
  }

  mergeRes(n, o) {
    for (let k in n) {
      if (Object.keys(n[k]).includes('_type')) {
        if (n[k]._type === 'NOT_SURE' && o[k]) {
          n[k]._type = o[k]._type || n[k]._type;
        }
      } else {
        if (o[k]) {
          this.mergeRes(n[k], o[k]);
        }
      }
    }
  }
}

module.exports = JsocDriver;