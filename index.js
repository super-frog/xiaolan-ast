
const path = require('path');

const ErrorDefinition = require('./handler/ErrorDefinition');
const ObjectDefinition = require('./handler/ObjectDefinition');
const RouteDefinition = require('./handler/RouteDefinition');
const HelperDefinition = require('./handler/HelperDefinition');
const ModelRender = require('./render/ModelRender');
const ClientRender = require('./render/ClientRender');
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

  return new ModelRender(tableDefinition, output);
};

index.findHandler = (file) => {
  return RouteDefinition(path.resolve(file));
};

index.genJsoc = (projectRoot) => {
  projectRoot = path.resolve(projectRoot);
  let jsoc = new JsocDriver(projectRoot);
};

index.genHelper = (file) => {
  return HelperDefinition(path.resolve(file));
};

index.genClient = (projectName, output) => {
  return (new ClientRender(projectName, output)).make();
};

module.exports = index;

