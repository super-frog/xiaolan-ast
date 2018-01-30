/**
 * Created by lanhao on 2017/9/16.
 * 通过route获取handler的方法
 */

'use strict';
const fs = require('fs');

module.exports = (file)=>{
  let route = require(file);
  return lookup(route.map());
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