import { coerceToVNode } from '../create-element'
import { EMPTY_ARR, EMPTY_OBJ } from '../constants'
import { unmount } from './index'
import { diff } from './index'

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

export function toChildArray(children, flattened, map, keepHoles) {
  if (flattened == null) flattened = []
  if (children == null || typeof children === 'boolean') {
    if (keepHoles) flattened.push(null)
  }
  else if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      toChildArray(children[i], flattened, map, keepHoles)
    }
  } else {
    flattened.push(map(children))
  }
  return flattened
}