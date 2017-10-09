//测试接口

const Robot = {
  //名字 string:0,20 in:query
  name: 'Robot Xiaolan',
  //年龄 number:0,99 in:body
  //註冊用戶的年齡
  //默認18歲
  age:18,
  //指定ID number:0,65535 in:params
  id:1,
};

const hd = (Robot) => {
  if(1){
    return error.COMMON_ERROR;
  }
  return [Robot];
};

module.exports = hd;