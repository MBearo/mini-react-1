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

## 组件Component
react中的所有的class组件都继承Component, Component构造函数初始化了props、context、state等实例属性

```js
export function Component(props, context) {
  this.props = props
  this.context = context
  if (this.state == null) this.state = {}
  this.dirty = true
  this._renderCallbacks = []
}
```
还有setState的原型方法, setState是异步的, 它会将一个多个setState都合并都已一个this.nextState上,
把callback推入一个队列中, enqueueRender会利用Promise的异步执行更新
```js
Component.prototype.setState = function (update, callback) {
  // 确定_nextState值
  let s = (this._nextState!==this.state && this._nextState) || (this._nextState = assign({}, this.state))

  // 合并update的内容到state上
  if (typeof update !== 'function' || (update = update(s, this.props))) {
    assign(s, update)
  }

  if (update==null) return

  if (this._vnode) {
    if (callback) this._renderCallbacks.push(callback)
    enqueueRender(this)
  }
}
```

`forceUpdate`用来更新setState之后的视图, 利用diff对比新旧vnode更新, 这时的state还是旧的,新的存在nextState里, 完成一次更新
```js
Component.prototype.forceUpdate = function (callback) {
  let vnode = this._vnode, dom = this._vnode._dom, parentDom = this._parentDom
  if (parentDom) {
    const force = callback!==false

    let mounts = []
    dom = diff(parentDom, vnode, vnode, this._context, mounts, this.__ancestorComponent, dom)
    if (dom != null && dom.parentNode !== parentDom) {
      parentDom.appendChild(dom)
    }
    commitRoot(mounts, vnode)
  }
  if (callback) callback()
}
```

## diff
<img src='http://ww1.sinaimg.cn/large/b44313e1ly1g4b70er89lj20ah05jt8o.jpg'>
<img src="http://ww1.sinaimg.cn/large/b44313e1ly1g4b6xjublcj21a21nmn3t.jpg">