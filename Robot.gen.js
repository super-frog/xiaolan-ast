'use strict';



class Robot {
  constructor(options={}){
    this.name = options.name || 'Robot Xiaolan';
    this.test = options.test || 1;
    this.validate();
  }

  static fromRequest(req){
    let options={};
    options.name = this.pick(req, 'query.name', 'string', 'Robot Xiaolan');
    options.test = this.pick(req, 'query.test', 'enum', 1);
    return new Robot(options);
  }

  getTest(){
    return ['unknown','A','B','C'][this.test];
  }

  validate(){
    if(!((typeof this.name === 'string') && (this.name.length>=0) && (this.name.length<=9007199254740991))){
      throw new Error('type validate failed: [name]: String length must between 0 to 9007199254740991');
    }

    if(['unknown','A','B','C'][this.test] === undefined){
      throw new Error('type validate failed: [test]: test can only choosing from [" 0 -> unknown  , 1 -> A  , 2 -> B  , 3 -> C  ,"]');
    }

  }

  static pick(source, path, type=null, defaultValue=null){
    let paths = path.split('.');
    let tmp = source;
    for(let k in paths){
      if(tmp[paths[k]]){
        tmp = tmp[paths[k]];
      }else{
        tmp = tmp[paths[k]];
        break;
      }
    }
    if(tmp===undefined){
      return defaultValue;
    }
    switch (type){
    case 'string':
    case 'enum':
      if(typeof tmp === 'object'){
        tmp = JSON.stringify(tmp);
      }else{
        tmp = tmp.toString();
      }
      break;
    case 'number':
      tmp = 1*tmp;
      break;
    }
    return (defaultValue && (undefined===tmp)) ? defaultValue: tmp;
  }
}

module.exports = Robot;