/**
 * Created by lanhao on 2017/9/4.
 */

'use strict';

function parseTag(tag) {
  if(tag.startsWith('[]')){
    return arrayTag(tag.replace('[]',''));
  }
  tag = tag.split(':');
  switch (tag[0].toLowerCase()) {
    case 'int':
    case 'integer':
      return integerTag(tag[1]);
      break;
    case 'string':
      return stringTag(tag[1]);
      break;
    case 'enum':
      return enumTag(tag[1]);
      break;
    case 'required':
    case 'require':
      return requiredTag();
      break;
    case 'in':
    case 'from':
      return inTag(tag[1]);
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

function integerTag(tagValue) {
  tagValue = tagValue || '';
  let tag = {
    name: 'type',
    prop: {
      name: 'integer',
      range: [0, Number.MAX_SAFE_INTEGER]
    },
  };
  let [min, max] = tagValue.split(',');
  if (!isNaN(min) && !isNaN(max)) {
    tag.prop.range = [min * 1, max * 1];
  }
  return tag;
}

function stringTag(tagValue) {
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
    prop:  tagValue || '',
  };
}

function otherTag(tagValue) {
  return {
    name: 'comment',
    prop:  tagValue,
  };
}

function enumTag(tagValue) {
  tagValue = tagValue || '';
  return {
    name: 'type',
    prop: {
      name: 'enum',
      options:['unknown'].concat(tagValue.split(','))
    },
  };
}

module.exports = parseTag;