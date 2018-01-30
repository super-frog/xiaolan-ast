'use strict';
const request = require('request-agent').init();
const BaseRender = require('./BaseRender');
const templateBank = require('../tpl/templateBank');
const EOL = require('os').EOL;

class ClientRender extends BaseRender {
  constructor(projectName, output, specJsoc) {
    super({});
    this.url = specJsoc || `https://raw.githubusercontent.com/${projectName}/master/jsoc.json`;
    this.ouputPath = output;
    this.output = [];
    this.data._method_ = [];
    this.data._name_ = camel(projectName.replace('-', ''), true);

  }

  async getJsoc() {
    console.log(this.url);
    let jsoc = await request.method('get').url(this.url).send();
    if (jsoc.statusCode === 200) {
      let body = JSON.parse(jsoc.body);
      if (body.code === 200) {
        body = body.data;
      }
      return body;
    } else {
      throw new Error('jsoc not found');
    }
  }

  async make() {
    let { apis, errors } = await this.getJsoc();
    for (let k in apis) {
      this.data._method_.push(this.restFunc(apis[k]));
    }
    let tpl = templateBank('Client').split(EOL);

    for (let k in tpl) {
      let tokens = this.findToken(tpl[k]);

      if (tokens) {

        for (let i in tokens) {
          this.output = this.output.concat(this.renderLine(tpl[k], tokens[i], this.data[tokens[i]]));
          // this.output = this.output.concat(this.data[tokens[i]]);
        }
      } else {
        this.output.push(tpl[k]);
      }
    }
    this.toFile();
  }

  restFunc(req) {
    let args = 'headers = {}, query = {}, body = {}';
    let url = req.request.path;
    for(let k in req.request.params){
      args = `${k}, `+args;
      url = url.replace(`{${k}}`,`'+${k}+'`);
    }
    let output = `//${req.desc}
  async ${req.name}(${args}){
    headers['content-type'] = headers['content-type'] || 'application/json';
    let resp = request.reset()
      .method('${req.request.method}')
      .url(this.host+'${url}')
      .headers(headers)
      .query(query)
      .body(body)
      .send();
    if(resp.statusCode===200){
      return JSON.parse(resp.body);
    }else{
      let err = new Error();
      err.statusCode = resp.statusCode;
      return err;
    }
  }
  `;
    return output;
  }

}

const camel = (str, studlyCaps = false) => {
  let o = sp(str)
  let output = [];
  for (let k in o) {
    let arr = Array.from(o[k]);
    (k > 0 || studlyCaps == true) && (arr[0] = arr[0].toUpperCase());
    output.push(arr.join(''));
  }
  return output.join('');
};

function sp(str) {
  let separator = '/';

  let output = [];
  let pieces = str.split(separator);
  for (let k in pieces) {
    output = output.concat(pieces[k]);
  }
  return output;
}

module.exports = ClientRender;