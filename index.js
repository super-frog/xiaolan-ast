/**
 * Created by lanhao on 2017/9/13.
 */

'use strict';
const path = require('path');

const ErrorDefinition = require('./handler/ErrorDefinition');
const ObjectDefinition = require('./handler/ObjectDefinition');
const RouteDefinition = require('./handler/RouteDefinition');
const ModelRender = require('./render/ModelRender');
const JsocDriver = require('./handler/JsocDriver');


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

index.genJsoc = (projectRoot) => {
  projectRoot = path.resolve(projectRoot);
  let jsoc = new JsocDriver(projectRoot);
  
};

module.exports = index;

