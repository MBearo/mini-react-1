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

只要比较同层级的节点, preact会储存上一次渲染的VNode(储存在_preVNode的私有属性上),是否要生成新的dom、还是
卸载dom、还是更新dom(我们将VNode对应的真实的dom存储在VNode的私有属性_dom, 可以实现在diff的过程中更新dom的操作)。
```js
export function diff(parentDom, newVNode, oldVNode, context, mounts, ancestorComponent, oldDom) {

  // 新的type不匹配旧的,直接卸载整个dom
  if (oldVNode == null || newVNode == null || oldVNode.type !== newVNode.type || oldVNode.key !== newVNode.key) {
    if (oldVNode != null) unmount(oldVNode, ancestorComponent)
    if (newVNode==null) return null
    oldVNode = EMPTY_OBJ
  }

  let c, tmp, isNew, oldProps, oldState,
    newType = newVNode.type
  
  try {
    outer: if (oldVNode.type === Fragment || newType === Fragment) {
      diffChildren(parentDom, newVNode, oldVNode, context, mounts, ancestorComponent, oldDom)
    }
    else if (typeof newType === 'function') {
      
      if (oldVNode._component) {
        c = newVNode._component = oldVNode._component
        newVNode._dom = oldVNode._dom
      }
      else {
        if (newType.prototype && newType.prototype.render) {
          newVNode._component = c = new newType(newVNode.props, context)
        }
        else {
          newVNode._component = c = new Component(newType.props, context)
          c.constructor = newType
          c.render = doRender
        }
        c._ancestorComponent = ancestorComponent
        c.props = newType.props
        if(!c.state) c.state = {}
        c.context = context
        isNew = c._ditry = true
        c._renderCallbacks = []
      }

      c._vnode = newVNode

      if (c._nextState == null) {
        c._nextState = c.state
      }

      if (isNew) {
        if (newType.getDerivedStateFromProps==null && c.componentWillUnmount!=null) c.componentWillUnmount()
        if (c.componentDidMount!=null) mounts.push(c)
      }
      else {
        if (newType.getDerivedStateFromProps == null && c.componentWillReceiveProps != null) {
          c.componentWillReceiveProps(newVNode.props, context)
        }

        if (c.shouldComponentUpdate != null && c.shouldComponentUpdate(newType.props, c._nextState, context) === false) {
          c.props = newVNode.props
          c.state = c._nextState
          c._dirty = false
          break outer
        }

        if (c.componentWillUpdate != null) {
          c.componentWillUpdate(newVNode.props, c._nextState, context)
        }
      }

      oldProps = c.props
      oldState = c.state

      c.context = context
      c.props = newType.props
      c.state = c._nextState

      let prev = c._prevVNode || null
      c._ditry = false
      let vnode = c._prevVNode = coerceToVNode(c.render(c.props, c.state, c.context))

      c._depth = ancestorComponent ? (ancestorComponent._depth || 0) + 1 : 0
      c.base = newVNode._dom = diff(parentDom, vnode, prev, context, mounts, c, oldDom)

      c._parentDom = parentDom

      while (tmp = c._renderCallbacks.pop()) tmp.call(c)
      
      if (!isNew && oldProps != null && c.componentWillUpdate != null) {
        c.componentDidUpdate(oldProps, oldState)
      }
    }
    else {  // type === 'div'
      newVNode._dom = diffElemntNodes(oldVNode._dom, newVNode, oldVNode, context, mounts, ancestorComponent)
    }
  } catch (e) {
    console.log(e)
  }

  return newVNode._dom
}
```
diff会对vnode的类型进行判断, function(组件)、Fragment类型、一般dom、三种类型

### diff一般Dom节点类型
diffElemntNodes实现, 当为文本节点,直接更新dom.data值;
不为文本节点时,`diffChildren`和diffProps更新dom(会递归对子节点进行操作)
```js
export function diffElemntNodes(dom, newVNode, oldVNode, context, mounts, ancestorComponent) {
  let i
  let oldProps = oldVNode.props
  let newProps = newVNode.props
  
  if (dom == null) {
    if (newVNode.type === null) {
      return document.createTextNode(newProps)
    }
    dom = document.createElement(newVNode.type)
  }

  if (newVNode.type === null) { // 文本节点更新text
    if (oldProps !== newProps) {
      dom.data = newProps
    }
  }
  else {
    if (newVNode !== oldVNode) {
      if (oldProps == null) {
        oldProps = {}
      }

      diffChildren(dom, newVNode, oldVNode, context, mounts, ancestorComponent, EMPTY_OBJ)
      diffProps(dom, newProps, oldProps)
    }
  }
  return dom
}

export function commitRoot(mounts, root) {
  let c
  while (c = mounts.pop()) {
    try {
      c.componentDidMount()
    } catch (e) {
      console.log(e)
    }
  }
}

```

diffProps会删除和更新dom上的属性
```js
export function diffProps(dom, newProps, oldProps) {
  let i

  const keys = Object.keys(newProps).sort()
  for (i = 0; i < keys.length; i++) {
    const k = keys[i]
    if (k !== 'children' && k != 'key' && (!oldProps || ((k === 'value' || k === 'checked') ? dom : oldProps[k] !== newProps[k]))) {
      setProperty(dom, k, newProps[k], oldProps[k])
    }
  }

  for (i in oldProps) {
    if (i !== 'children' && i !== 'key' && !(i in newProps)) {
      setProperty(dom, i, null, oldProps[i])
    }
  }
}

```

### diff组件(type===function)

有旧组件直接用旧组件,没有时,会区分是class组件还是纯函数组件创建, 执行对应的生命周期
```js
if (oldVNode._component) {
  c = newVNode._component = oldVNode._component
  newVNode._dom = oldVNode._dom
}
else {
  if (newType.prototype && newType.prototype.render) {
    newVNode._component = c = new newType(newVNode.props, context)
  }
  else {
    newVNode._component = c = new Component(newType.props, context)  //_component就是在这时赋值的
    c.constructor = newType
    c.render = doRender
  }
  c._ancestorComponent = ancestorComponent
  c.props = newType.props
  if(!c.state) c.state = {}
  c.context = context
  isNew = c._ditry = true
  c._renderCallbacks = []
}
if (c._nextState == null) {
  c._nextState = c.state
}
if (isNew) {  // 初次渲染时
  if (newType.getDerivedStateFromProps==null && c.componentWillUnmount!=null) c.componentWillUnmount()
  if (c.componentDidMount!=null) mounts.push(c)
}
else {  //更新时
  if (newType.getDerivedStateFromProps == null && c.componentWillReceiveProps != null) {
    c.componentWillReceiveProps(newVNode.props, context)
  }

  if (c.shouldComponentUpdate != null && c.shouldComponentUpdate(newType.props, c._nextState, context) === false) {
    c.props = newVNode.props
    c.state = c._nextState
    c._dirty = false
    break outer
  }

  if (c.componentWillUpdate != null) {
    c.componentWillUpdate(newVNode.props, c._nextState, context)
  }
}

oldProps = c.props  //旧的oldProps
oldState = c.state  // 旧的state

c.context = context
c.props = newType.props
c.state = c._nextState  // 取出合并的_nextState,赋值给state

let prev = c._prevVNode || null
c._ditry = false
let vnode = c._prevVNode = coerceToVNode(c.render(c.props, c.state, c.context))  // 执行组件的render方法生成vnode

c._depth = ancestorComponent ? (ancestorComponent._depth || 0) + 1 : 0
c.base = newVNode._dom = diff(parentDom, vnode, prev, context, mounts, c, oldDom)

c._parentDom = parentDom

while (tmp = c._renderCallbacks.pop()) tmp.call(c)

if (!isNew && oldProps != null && c.componentWillUpdate != null) {
  c.componentDidUpdate(oldProps, oldState)
}
```

## 对比子节点

```js
export function diffChildren(parentDom, newParentVNode, oldParentVNode, context, mounts, ancestorComponent, oldDom) {
  let childVNode, i, j, oldVNode, newDom, sibDom

  let newChildren = newParentVNode._children || toChildArray(newParentVNode.props.children, newParentVNode._children=[], coerceToVNode, true)
  let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR

  let oldChildrenLength = oldChildren.length

  if (oldDom == EMPTY_OBJ) {
    oldDom = null
    for (i = 0; !oldDom && i < oldChildrenLength; i++) {
      oldDom = oldChildren[i] && oldChildren[i]._dom  // 取出old的dom列表中第一个存在的dom节点
    }
  }
  
  for (let i = 0; i < newChildren.length; i++) {
    childVNode = newChildren[i] = coerceToVNode(newChildren[i])

    if (childVNode != null) {
      
      oldVNode = oldChildren[i]

      if (oldVNode === null || (oldVNode && childVNode.key == oldChildren.key && childVNode.type === oldVNode.type)) {
        oldChildren[i] = undefined // 标记可复用的dom为undefined
      }
      else {
        for (j = 0; j < oldChildrenLength; j++) {
          oldVNode = oldChildren[j]
          if (oldVNode && childVNode.key == oldVNode.key && childVNode.type === oldVNode.type) {
            oldChildren[j] = undefined  // 标记可复用的dom为undefined
            break
          }
          oldVNode = null
        }
      }

      newDom = diff(parentDom, childVNode, oldVNode, context, mounts, ancestorComponent, oldDom)

      if (newDom != null) {
        if (newDom != oldDom || newDom.parentNod == null) {
          outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
            parentDom.appendChild(newDom)
          }
          else {
            for (sibDom = oldDom, j = 0; (sibDom = sibDom.nextSibling) && j < oldChildrenLength; j += 2) {
              if (sibDom === newDom) {  // newDom 出现在oldDom之后的情况
                break outer
              }
            }
            parentDom.insertBefore(newDom, oldDom)  // newDom 出现在oldDom之前的情况
          }
        }
        oldDom = newDom.nextSibling
      }
    }
  }
  for (i = oldChildrenLength; i--;) {  // 去除没有被复用的dom, 即不为undefined
    if (oldChildren[i] != null) {
      unmount(oldChildren[i], ancestorComponent)
    }
  } 
}
```
对比子节点实际就是新旧的列表的比较, preact中有key作为唯一的标识,可以使比较简化,
首先, 循环新的dom列表,
每个新的childVNode去寻找旧列表中可复用的(标记可复用的dom,位置为undefined),
没有找到时oldVNode为null, 通过diff生成新newDom, 找到时通过diff更新出newDom.

如果oldDom不存在, 其实就是初始化的情况或者比较到列表的最后;
如果oldDom存在情况,我们先查找oldDom后面的dom是否存在与newDom相等的dom。如果存在我们不去做任何处理(dom属性相关的变更已经在diffElementNode完成了)。; 如果我们在oldDom后面没有找到与newDom相等的dom，则说明列表不存在newDom，我们将插入到childDom的前面;
unmount函数的作用, 见名知义, 作用就是卸载组件和删除对应的DOM节点。

## commitRoot
```js
export function commitRoot(mounts, root) {
	let c;
	while ((c = mounts.pop())) {
		try {
			c.componentDidMount();
		}
		catch (e) {
			catchErrorInComponent(e, c._ancestorComponent);
		}
	}

	if (options.commit) options.commit(root);
}
```
commitRoot方法很简单, 就是在组件渲染完成后执行组件的componentDidMount生命周期。其中mounts中装载了所有第一次渲染的组件。
