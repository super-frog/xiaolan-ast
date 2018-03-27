/**
 * Created by lanhao on 2017/9/4.
 */

'use strict';

function parseTag(tag) {
  if (tag.startsWith('[]')) {
    return arrayTag(tag.replace('[]', ''));
  }
  tag = tag.split(':');

  switch (tag[0].toLowerCase()) {
    case 'number':
      return numberTag(tag[1], tag[2]);
      break;
    case 'string':
      return stringTag(tag[1], tag[2]);
      break;
    case 'enum':
      return enumTag(tag[1], tag[2]);
      break;
    case 'required':
    case 'require':
      return requiredTag();
      break;
    case 'in':
    case 'from':
      return inTag(tag[1]);
      break;
    case 'json':
      return jsonKeyTag(tag[1]);
      break;
    case 'default':
      return defaultTag(tag[1]);
      break;
    default:
      return otherTag(tag[0]);
      break;
  }
};

function arrayTag(member) {
  let m = parseTag(member);
  return {
    name: 'type',
    prop: {
      name: 'array',
      member: m.prop,
    },
  };
}

function numberTag(tagValue, memberRange = null) {

  tagValue = tagValue || '';
  let tag = {
    name: 'type',
    prop: {
      name: 'number',
      range: [0, Number.MAX_SAFE_INTEGER]
    },
  };
  let [min, max] = tagValue.split(',');
  if (!isNaN(min) && !isNaN(max)) {
    tag.prop.range = [min * 1, max * 1];
  }
  if (memberRange !== null) {
    let [min, max] = memberRange.split(',');
    if (!isNaN(min) && !isNaN(max)) {
      [min, max] = [min * 1, max * 1];
    }
    tag.prop.memberRange = [min || 0, max || Number.MAX_SAFE_INTEGER];
  }

  return tag;
}

function stringTag(tagValue, memberRange = null) {
  tagValue = tagValue || '';
  let tag = {
    name: 'type',
    prop: {
      name: 'string',
      length: [0, Number.MAX_SAFE_INTEGER]
    },
  };
  let [min, max] = tagValue.split(',');
  if (!isNaN(min) && !isNaN(max)) {
    tag.prop.length = [min * 1, max * 1];
  }
  if (memberRange !== null) {
    let [min, max] = memberRange.split(',');
    if (!isNaN(min) && !isNaN(max)) {
      [min, max] = [min * 1, max * 1];
    }
    tag.prop.memberLength = [min || 0, max || Number.MAX_SAFE_INTEGER];
  }
  return tag;
}

function requiredTag() {
  return {
    name: 'requirement',
    prop: true,
  };
}

function defaultTag(tagValue) {
  return {
    name: 'defaultValue',
    prop: tagValue || '',
  };
}

function inTag(tagValue) {
  return {
    name: 'in',
    prop: tagValue || '',
  };
}

function otherTag(tagValue) {
  return {
    name: 'comment',
    prop: tagValue,
  };
}

function enumTag(tagValue, memberOptions = null) {
  let ranges = null;
  if(memberOptions!==null){
    ranges = tagValue;
    tagValue = memberOptions;
  }
  tagValue = tagValue || '';
  let options = ['unknown'].concat(tagValue.split(','));
  let obj = {};
  for (let k in options) {
    if (options[k] !== '') {
      obj[`${k}`] = options[k];
    }
  }
  return {
    name: 'type',
    prop: {
      name: 'enum',
      options: obj,
      length: ranges===null?null:ranges.split(',')
    },
  };
}

function jsonKeyTag(tagValue) {
  return {
    name: 'key',
    prop: tagValue
  };
}

module.exports = parseTag;