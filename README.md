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

## 生成vnode
不管vue、react都是采用vnode,目的是为了减少dom操作,提高性能,
这里会将上一步babel解析的js对象生成的vnode(vnode其实也是js对象)
`createElement`就是上面解析的h函数
```js
export function createElement(type, props, children) {
	props = assign({}, props);

	if (arguments.length>3) {  // 子节点合并
		children = [children];
		for (let i=3; i<arguments.length; i++) {
			children.push(arguments[i]);
		}
	}
	if (children!=null) {
		props.children = children;
	}
	if (type!=null && type.defaultProps!=null) {  //  是否有defaultProps, 成为props的初始值
		for (let i in type.defaultProps) {
			if (props[i]===undefined) props[i] = type.defaultProps[i];
		}
	}
	let ref = props.ref;
	let key = props.key;
	if (ref!=null) delete props.ref;
	if (key!=null) delete props.key;

	return createVNode(type, props, key, ref);
}

export function createVNode(type, props, key, ref) {
	const vnode = {
		type,  // dom的标签
		props,  //dom的属性, 事件...
		key,  //key
		ref,  //ref
		_children: null,
		_dom: null,
		_lastDomChild: null,
		_component: null
	};
	vnode._self = vnode;

	return vnode;
}
```