import { assign } from './util'
import { diff, commitRoot } from './diff/index'
import { Fragment } from './create-element'

export function Component(props, context) {
  this.props = props
  this.context = context
  if (this.state == null) this.state = {}
  this.dirty = true
  this._renderCallbacks = []
}

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

let q = []


Component.prototype.render = Fragment

const defer = typeof Promise=='function' ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout

export function enqueueRender(c) {
  if (!c._dirty && (c._dirty = true) && q.push(c) === 1) {
    defer(process)
  }
}


function process() {
  let p
  q.sort((a, b) => b._depth - a._depth)
  while ((p = q.pop())) {
    if(p._dirty) p.forceUpdate()
  }
}