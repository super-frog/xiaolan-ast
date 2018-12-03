
const BaseRender = require('./BaseRender');
const faker = require('../lib/faker');
const EOL = require('os').EOL;

class TestSuitRender extends BaseRender{
  constructor(jsoc, output)
  {
    super(null);

    this.ouputPath = output;
    this.project = jsoc.projectRoot.split('/').pop();
    this.data._name_ = this.project;
    this.host = process.env[this.project.toUpperCase()+'_HOST'];
    if(this.host === undefined){
      console.log(`process.env[${this.project.toUpperCase()+'_HOST'}] NOT SET`);
      process.exit(-1);
    }
    //this.errors = jsoc.definitions;
    this.apis = jsoc.apis;

    this.dependence();
    this.output.push('(async ()=>{');
    this.output.push('  let resp = null;');
    for(let k in this.apis){
      this.renderApi(this.apis[k]);
    }

    this.output.push(`})();${EOL}`);
  }

  dependence(){
    this.output.push(`const request = require('request-agent');${EOL}`);
    this.output.push(`const fs = require('fs');${EOL}`);
    this.output.push(`let suit = null;
if(fs.existsSync('./suit.json')){
  suit = require('./suit.json');
}
`);
  }

  renderApi(api){
    this.output.push(`${EOL}  // 测试接口 ${api.desc} [${api.name}]`);

    let boundary = ['params','headers','query','body'];

    for(let bId in boundary) {
      for(let field in api.request[boundary[bId]]) {

        let inputs = this.makeInputs(api.request[boundary[bId]][field]);
        let ops = ['!==','===','===','===','!=='];
        for(let inputId in inputs) {
          let currentApi = JSON.parse(JSON.stringify(api));

          currentApi.request[boundary[bId]][field]._test = inputs[inputId];
          
          this.output.push(`${EOL}  //测试边界 ${boundary[bId]} - ${field}=${inputs[inputId]}`);
          this.output.push(`  console.log('测试边界 ${boundary[bId]} - ${field}=${inputs[inputId]}');`);
          this.output.push('  resp = await request.init()');

          for (let k in currentApi.request.params) {
            let inItem = currentApi.request.params[k];
            currentApi.request.uri = currentApi.request.uri.replace(`{${k}}`, this.makeData(inItem));
          }

          this.output.push(`    .url('${this.host}${currentApi.request.uri}')`);

          this.output.push(`    .method('${currentApi.request.method}')`);
          this.output.push('    .headers({\'content-type\': \'application/json\'})');
          let inList = ['headers', 'query', 'body'];
          for (let k in inList) {
            this.output.push(`    .${inList[k]}(${this.makeObj(currentApi.request[inList[k]])})`);
          }
          this.output.push('    .send();');
          this.output.push(`  if(! (200 ${ops[inputId]} resp.statusCode)){`);
          this.output.push('    console.log(resp.body);');
          this.output.push('    console.log(\' Failed !! \');');
          this.output.push('    process.exit(-1);');
          this.output.push('  }');
        }
      }
    }

  }

  makeObj(inItemList){
    let result = {};
    for(let k in inItemList){
      result[k] = this.makeData(inItemList[k]);
    }
    return JSON.stringify(result);
  }

  makeData(inItem){
    if(inItem._type === undefined){
      if(Array.isArray(inItem)){
        //array
        let result = [];
        for(let k in inItem){
          result.push(this.makeData(inItem[k]));
        }
        return result;
      }else{
        //object
        let result = {};
        for(let k in inItem){
          result[k] = this.makeData(inItem[k]);
        }
        return result;
      }

    }else {
      switch (inItem._type) {
      case 'number':
        return inItem._test === undefined ? faker.number(inItem._range[0], inItem._range[1]) : inItem._test;
      case 'string':
        return inItem._test === undefined ? faker.string(inItem._length[0], inItem._length[1]) : inItem._test;
      default:
        return '';
      }
    }
  }

  makeInputs(inItem){
    switch (inItem._type){
    case 'number':
      return [
        inItem._range[0]-1,inItem._range[0],
        faker.number(inItem._range[0],inItem._range[1]),
        inItem._range[1],
        inItem._range[1]+1
      ];
    case 'string':
      return [
        faker.string(inItem._length[0]-1<0?0:inItem._length[0]-1,inItem._length[0]-1<0?0:inItem._length[0]-1),
        faker.string(inItem._length[0],inItem._length[0]),
        faker.string(inItem._length[0],inItem._length[1]),
        faker.string(inItem._length[1],inItem._length[1]),
        faker.string(inItem._length[1]+1,inItem._length[1]+1),
      ];
      //todo more type
    default:
      return [];
    }
  }

}

module.exports = TestSuitRender;