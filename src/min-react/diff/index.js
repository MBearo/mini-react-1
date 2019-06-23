import { EMPTY_OBJ } from '../constants'
import { diffChildren } from './children'
import { Component } from '../component'
import { assign, removeNode } from '../util'
import { coerceToVNode, Fragment } from '../create-element' 
import { diffProps } from './props'

export function diff(parentDom, newVNode, oldVNode, context, mounts, ancestorComponent, oldDom) {

  // 新的type不匹配旧的
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


export function doRender(props, state, context) {
  return this.constructor(props, context)
}


export function unmount(vnode, ancestorComponent) {
  let r 
  let dom = vnode._dom
  
  if ((r = vnode._component) != null) {
    if (r.componentWillUnmount) {
      try {
        r.componentWillUnmount()
      }
      catch (e) {
        console.log(e)
      }
    }
    r.base = r._parentDom = null
    if (r = r._prevVNode) unmount(r, ancestorComponent)
  }
  else if (r = vnode._children) {
    for (let i = 0; i < r.length; i++) {
      if (r[i]) unmount(r[i], ancestorComponent)
    }
  }
  if (dom!=null) removeNode(dom)
}