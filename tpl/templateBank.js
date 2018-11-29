const fs = require('fs');
const path = require('path');

const BASE_PATH = path.resolve(__dirname);
let templateBank = {};

module.exports = (tpl)=>{
  if (templateBank[tpl] === undefined && fs.existsSync(BASE_PATH+'/'+tpl+'.tpl')){
    templateBank[tpl] = fs.readFileSync(BASE_PATH+'/'+tpl+'.tpl').toString();
  }
  return templateBank[tpl] || '';
};