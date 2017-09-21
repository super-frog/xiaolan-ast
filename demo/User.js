
const User = {
  //用户名 string required in:body
  //用於在前台頁面展示
  name:'doge',
  //年龄 int:0,99 in:body
  //註冊用戶的年齡
  //默認18歲
  age:18,
  //性別 enum:男,女 in:query
  gender:1,
  //值班日 enum:星期一,星期二,星期三,星期四,星期五 in:body
  weekday:1,
  //愛好列表 []string:2,8 in:body
  fav:['fm2017'],
  //出生日期 in:body
  dob:{
    //年份，格式：2017 int:1900,2100 in
    year:2017,
    //月份，沒有前置0 int:1,12
    month:9,
    //日，沒有前置0 int:0,31
    day:6,
  }
};

