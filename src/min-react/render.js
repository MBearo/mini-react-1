import { createElement, Fragment } from './create-element'
import { commitRoot } from './diff/index'
import { diffChildren } from './diff/children'

export function render(vnode, parentDom) {
  let oldVNode = parentDom._prevVNode
  vnode = createElement(Fragment, null, [vnode])
  let mounts = []
  parentDom._prevVNode = vnode
  diffChildren(
    parentDom,
    vnode,
    oldVNode,
    {},
    mounts,
    vnode,
    {}
  )
  commitRoot(mounts, vnode)
}