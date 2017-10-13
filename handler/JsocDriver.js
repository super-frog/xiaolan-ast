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
    this.definitions = {};
    this.apis = {};
    this.loadErrorDefinitions();
    this.scan();
    fs.writeFileSync(process.cwd()+'/jsoc.json', JSON.stringify(this, null, 2));
    console.log('File generated in : '+process.cwd()+'/jsoc.json');
  }

  scan() {
    if (!fs.existsSync(`${this.projectRoot}/routes.js`)) {
      console.log(`can not found routes.js${EOL}`.red);
      process.exit(-1);
    }
    let routes = require(`${this.projectRoot}/routes.js`);
    routes = this.routing(routes);

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
            code: 0,
            data: returns[k],
            message: ''
          };
          jsocResponse.success.push(this.jsocResponse(returns[k]));
        } else {
          jsocResponse.failed.push(this.jsocResponse(returns[k]));
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

  fattenReturn(ret){
    
    let result = [];
    
    for(let k in ret) {

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

  jsocRequest(scope,route){
    let astObjects = scope.astObjects();
    let result = {};
    result.method = route.method;
    result.uri = route.uri;
    result.query = {};
    result.params = {};
    result.body = {};
    let requestObj = null;
    for(let k in scope.def){
      if(scope.def[k].exports === true){
        requestObj = scope.def[k].args;
        break;
      }
    }
    for(let k in requestObj){
      let objectDefinition = astObjects[requestObj[k]] || null;
      if(objectDefinition === null){
        continue;
      }

      for(let i in objectDefinition.props){
        result[objectDefinition.props[i].definition.in][i] = {
          _type: objectDefinition.props[i].definition.type.name,
          _default:objectDefinition.props[i].definition.defaultValue,
          _desc: [objectDefinition.props[i].definition.comment,objectDefinition.props[i].definition.description].join(' ')
        };
        if(objectDefinition.props[i].definition.type.length){
          result[objectDefinition.props[i].definition.in][i]._length = objectDefinition.props[i].definition.type.length;
        }
        if(objectDefinition.props[i].definition.type.range){
          result[objectDefinition.props[i].definition.in][i]._range = objectDefinition.props[i].definition.type.range;
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
    if (!fs.existsSync(`${this.projectRoot}/errors/Error.gen.js`)) {
      console.log(`can not found errors/Error.gen.js${EOL}`.red);
      process.exit(-1);
    }
    let errorDefinitions = require(`${this.projectRoot}/errors/Error.gen.js`);
    for (let k in errorDefinitions) {
      this.definitions['error.' + errorDefinitions[k].name] = (new XiaolanError(errorDefinitions[k])).obj();
    }
  }

  formatReturn(ret) {
    let result = {};
    switch (ret.type) {
      case 'func':
        
        break;
      case 'unknown':
        result = this.definitions[ret.value];
        break;
      case 'object':
        for (let k in ret.value) {
          result[k] = ret.value[k].value.type;
        }
        break;
      case 'array':
        result = [this.formatReturn(ret.value)];
        break;
    }
    return result;
  }

  routing(routes) {
    let result = {};
    for (let k in routes) {
      let [method, uri] = k.split(' ');
      result[routes[k].handler] = {
        method,
        uri,
        handlers: [...routes[k].middleware, routes[k].handler]
      };
    }
    return result;
  }

}

module.exports = JsocDriver;