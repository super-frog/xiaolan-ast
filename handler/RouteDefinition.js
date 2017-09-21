/**
 * Created by lanhao on 2017/9/16.
 */

'use strict';
const esprima = require('esprima');
const fs = require('fs');

module.exports = (file)=>{
  let route = require(file);
  return lookup(route);
};

function lookup(route) {
  let result = new Set();
  for(let k in route){
    result.add(route[k].handler);
    if(route[k].middleware){
      route[k].middleware.map((item)=>{
        result.add(item);
      });
    }
  }

  return Array.from(result);
}