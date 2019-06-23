import { assign } from './util'

export function createElement(type, props, children) {
  props = assign({}, props)
  if (arguments.length > 3) {
    children = [children]
    for (let i = 3; i < arguments.length; i++) {
      children.push(arguments[i])
    }
  }

  if (children!=null) {
    props.children = children
  }

  if (type != null && type.defaultProps != null) {
    for (let i in type.defaultProps) {
      if (props[i]===undefined) props[i] = type.defaultProps[i]
    }
  }
  let ref = props.ref
  let key = props.key
  if (ref!=null) delete props.ref
  if (key!=null) delete props.key

  return createVNode(type, props, key, ref)
}


export function createVNode(type, props, key, ref) {
  const vnode = {
    type,
    props,
    key,
    ref,
    _children: null,
    _dom: null,
    _component: null
  }
  vnode._self = vnode

  return vnode
}

export function Fragment() { }


export function coerceToVNode(possibleVNode) {
  if (possibleVNode == null || typeof possibleVNode === 'boolean') return null
  if (typeof possibleVNode === 'string' || typeof possibleVNode === 'number') {
    return createVNode(null, possibleVNode, null, null)
  }
  if (Array.isArray(possibleVNode)) {
    return createElement(Fragment, null, possibleVNode)
  }

  if (possibleVNode._dom != null || possibleVNode._component != null) {
    let vnode = createVNode(possibleVNode.type, possibleVNode.props, possibleVNode.key, null)
    vnode._dom = possibleVNode._dom
    return vnode
  }

  return possibleVNode
}