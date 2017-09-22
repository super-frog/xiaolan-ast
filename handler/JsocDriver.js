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

class JsocDriver {
  constructor(projectRoot, specHost = '') {
    this.host = specHost;
    this.projectRoot = projectRoot;
    this.definitions = {};
    this.apis = {};
    this.loadErrorDefinitions();
    this.scan();
  }

  scan() {
    if(!fs.existsSync(`${this.projectRoot}/routes.js`)){
      console.log(`can not found routes.js${EOL}`.red);
      process.exit(-1);
    }
    let handlers = RouterHandler(`${this.projectRoot}/routes.js`);
    for(let k in handlers){
      let handler = `${this.projectRoot}/handlers/${handlers[k]}.js`;
      let scope = new Scope(handlers[k], handler);
      let returns = scope.ret;

    }
  }

  loadErrorDefinitions(){
    if(!fs.existsSync(`${this.projectRoot}/routes.js`)){

    }
  }
}

module.exports = JsocDriver;