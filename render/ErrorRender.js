const BaseRender = require('./BaseRender');
const templateBank = require('../tpl/templateBank');
const EOL = require('os').EOL;

class ErrorRender extends BaseRender {
  constructor(definition, output) {
    super(definition);
    this.ouputPath = output;
    this.data._name_='Error';
    this.AI = {};
    this.output=[];
    this.parse();
    let tpl = templateBank('ErrorModule').split(EOL);
    for(let k in tpl){
      let tokens = this.findToken(tpl[k]);

      if (tokens) {
        
        for (let i in tokens) {
          this.output = this.output.concat(this.data[tokens[i]]);
        }
      } else {
        this.output.push(tpl[k]);
      }
    }
  }

  parse(){
    this.data._error_ = [];
    for(let k in this.definition.props){
      let p = this.definition.props[k];
      let tmp = `  {${EOL}`;
      tmp += `    name: '${k}',${EOL}`;
      tmp += `    httpStatus: ${p.definition.defaultValue},${EOL}`;
      tmp += `    code: (process.env.APPID || 1001)*1e6+${this.errorCode(p.definition.defaultValue)},${EOL}`;
      tmp += `    message: '${p.definition.comment}',${EOL}`;
      tmp += `  },`;
      this.data._error_.push(tmp);
    }
  }

  errorCode(httpCode){
    this.AI[httpCode] = this.AI[httpCode] || 0;
    this.AI[httpCode]++;
    return httpCode*1e3 + this.AI[httpCode];
  }

}

module.exports = ErrorRender;