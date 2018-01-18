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
      let scope;
      let returns = [];

      for (let i in routes[k].handlers) {
        let handler = `${this.projectRoot}/handlers/${routes[k].handlers[i]}.js`;
        scope = new Scope(routes[k].handlers[i], handler);
        returns = returns.concat(this.fattenReturn(scope.ret));
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

      this.apis[scope.name] = {
        name: scope.name,
        desc: scope.desc,
        group: '',
        request: this.jsocRequest(scope, routes[k]),
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
          type: 'NOT SURE'
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

  jsocRequest(scope, route) {
    let astObjects = scope.astObjects();
    let result = {};
    result.method = route.method;
    result.path = route.path;
    result.query = {};
    result.params = {};
    result.body = {};
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

        if (objectDefinition.props[i].definition.type.length) {
          _node._length = objectDefinition.props[i].definition.type.length;
        }
        if (objectDefinition.props[i].definition.type.range) {
          _node._range = objectDefinition.props[i].definition.type.range;
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
        result.data[k] = {
          _type: ret.data[k]
        };
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
        result = this.errors[ret.value];
        if (result) {
          result.message = (result.message || '') + ret.msg || '';
        }else{
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
          result[k] = (ret.value[k] && ret.value[k].value) ? ret.value[k].value.type : 'not sure';
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

}

module.exports = JsocDriver;