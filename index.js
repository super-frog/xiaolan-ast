/**
 * Created by lanhao on 2017/9/13.
 */

'use strict';
const path = require('path');
const ErrorDefinition = require('./handler/ErrorDefinition');
const ObjectDefinition = require('./handler/ObjectDefinition');

let index = {};

index.genError = (file, output) => {
  output = output || process.cwd();
  return ErrorDefinition(path.resolve(file), output);
};

index.genClass = (file, output) => {
  output = output || process.cwd();
  return ObjectDefinition(path.resolve(file), output);
};

module.exports = index;

index.genClass('./demo/User.js', './tests');
index.genError('./demo/Error.js', './tests');