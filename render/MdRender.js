const BaseRender = require('./BaseRender');

class MdRender extends BaseRender {
    constructor(jsoc, output){
        super(null)
        this.ouputPath = output;
        this.project = jsoc.projectRoot.split('/').pop();
        this.data._name_ = this.project;
        this.host = process.env[this.project.toUpperCase()+'_HOST'];
        if(this.host === undefined){
          console.log(`process.env[${this.project.toUpperCase()+'_HOST'}] NOT SET`);
          process.exit(-1);
        }
        this.errors = jsoc.definitions;
        this.apis = jsoc.apis;
    }
}