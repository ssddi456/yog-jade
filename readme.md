### custom compiler for yog

此方案使得jade支持yog方案提供的资源管理系统，

使用：
修改```yog/conf/plugins/views.js```,加入
```js
  engine: {
    jade: require('yog-jade')
  }
```

之后就如fis其他模板引擎方案一样，
标签```link```,```style```移动到```head```内，
```script```自动移动到body末尾。

TODOS:
support bigpipe