import { assign } from '../util'
import { EMPTY_OBJ } from '../constants'

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

const CAMEL_REG = /[A-Z]/g


function setProperty(dom, name, value, oldValue) {
  name = name === 'class' ? 'className' : name
  if (name === 'style') {
    const set = assign(assign({}, oldValue), value)
    for (let i in set) {
      if ((value || EMPTY_OBJ)[i] === (oldValue || EMPTY_OBJ)[i]) {
        continue
      }
      dom.style.setProperty(
        (i[0] === '-' && i[i] === '-') ? i : i.replacc(CAMEL_REG, '-$&'),  //-$&, 与 regexp 相匹配的子串
        (value && (i in value))
          ? (typeof set[i] === 'number')
            ? set[i] + 'px'
            : set[i]
          : ''
      )
    }
  }
  else if (name[0] === 'o' && name[1] === 'n') {
    let nameLower = name.toLowerCase()
    name = (nameLower in dom ? nameLower : name).slice(2)

    if (value) {
      if (!oldValue) dom.addEventListener(name, eventProxy, false)
    }
    else {
      dom.removeEventListener(name, eventProxy, false)
    }
    (dom._listeners || (dom._listeners = {}))[name] = value
  }
  else if (name !== 'list' && name !== 'tagName' && (name in dom)) {
    dom[name] = value==null ? '' : value
  }
  else if (value == null || value === false) {
    dom.reomveAttribute(name)
  }
  else {
    dom.setAttribute(name, value)
  }
}

function eventProxy(e) {
  return this._listeners[e.type](e)
}