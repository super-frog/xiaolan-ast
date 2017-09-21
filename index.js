/**
 * Created by lanhao on 2017/9/13.
 */

'use strict';
const path = require('path');
const ErrorDefinition = require('./handler/ErrorDefinition');
const ObjectDefinition = require('./handler/ObjectDefinition');
const RouteDefinition = require('./handler/RouteDefinition');
const ModelRender = require('./render/ModelRender');

let index = {};

index.genError = (file, output) => {
  output = output || process.cwd();
  return ErrorDefinition(path.resolve(file), output);
};

index.genClass = (file, output) => {
  output = output || process.cwd();
  return ObjectDefinition(path.resolve(file), output);
};

index.genModel = (file, output) => {
  let tableDefinition = require(path.resolve(file));
  return new ModelRender(tableDefinition,output);
};

index.findHandler = (file) => {
  return RouteDefinition(path.resolve(file));
};

module.exports = index;

//console.log(JSON.stringify(index.genModel('./demo/model/User.js', './tests').toFile()));process.exit(0);
// index.genClass('./demo/User.js', './tests');
// console.log(JSON.stringify(index.findHandler('./demo/routes.js')));process.exit(-1);