# mini-react
complete 70% API of react

# 源码解析
## jsx
react采用的jsx, 将html写在js里, 利用babel的插件可以将jsx转化成js对象
```jsx
// 告诉 Babel 将 JSX 转化成 h() 的函数调用:
/** @jsx h */
let foo = <div id="foo">Hello!</div>;
// 转化后
var foo = h('div', {id:"foo"}, 'Hello!'); 
```
可以参考https://jasonformat.com/wtf-is-jsx/

