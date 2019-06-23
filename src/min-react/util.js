
export function assign(obj, props) {
  for (let i in props) obj[i] = props[i]
  return obj
}

// 去除子节点
export function removeNode(node) {
	let parentNode = node.parentNode;
	if (parentNode) parentNode.removeChild(node);
}
