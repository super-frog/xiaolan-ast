/**
 * Created by lanhao on 2017/9/2.
 */

'use strict';
const tagMap = require('../lib/tagMap');
const py = require('../lib/pinyin');

let astObject = {};

astObject.scan = (name, props) => {
  //console.log(JSON.stringify(props));process.exit(-1);
  let obj = {
    name,
    type: 'object',
    props: {},
    enumSet: {},
  };

  for (let k in props) {
    let p = props[k];
    p.parent = name.toLowerCase();
    let comment = parseComment(p) || {};
    if (p.value.type === 'ObjectExpression') {
      comment.type = {
        name: 'ref',
        ref: astObject.scan(py.camel(p.key.name, true), p.value.properties),
      };
    }
    obj.props[p.key.name] = {
      name: p.key.name,
      definition: comment
    };
    if (comment && comment.type && comment.type.name === 'enum') {
      obj.enumSet[p.key.name] = {
        desc:comment.comment,
        name:p.key.name,
        options:comment.type.options
      };
    }
  }
  return obj;
};


function parseComment(p) {
  let comment = p.leadingComments || [];
  if (!comment || comment.length === 0) {
    return null;
  }
  let desc = {};
  let pick = comment[0].value.split(' ');
  comment.shift();
  for (let k in pick) {
    let tmp = tagMap(pick[k]);
    desc[tmp.name] = tmp.prop;
  }
  desc['in'] = desc['in'] || p.parent;
  if (desc.defaultValue == undefined) {
    desc.defaultValue = calDefaultValue(p.value);
  }
  desc.description = ''
  for (let k in comment) {
    desc.description += comment[k].value + ';';
  }
  return desc;
}

function calDefaultValue(value) {
  if (!value.type) {
    return null;
  }
  switch (value.type) {
    case 'Literal':
      return value.value;
      break;
    case 'ArrayExpression':
      let dv = [];
      for (let k in value.elements) {
        dv.push(value.elements[k].value);
      }
      return dv;
      break;
  }
}

module.exports = astObject.scan;