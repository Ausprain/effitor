const editor = {
  mount: (host: HTMLDivElement) => {
    // 初始化编辑器
    console.log(host)
  },
}

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)

const countCost = (fn: () => void, count = 100) => {
  const start = performance.now()
  for (let i = 0; i < count; i++) {
    fn()
  }
  return performance.now() - start
}

// const delByRange = (startNode: Node, startOffset: number, endNode: Node, endOffset: number) => {
//   const r = document.createRange()
//   r.setStart(startNode, startOffset)
//   r.setEnd(endNode, endOffset)
//   r.deleteContents()
// }
// const delByManual = (startNode: Node, startOffset: number, endNode: Node, endOffset: number) => {

// }

const findCommonAncestorByRange = (startNode: Node, startOffset: number, endNode: Node, endOffset: number) => {
  const r = document.createRange()
  r.setStart(startNode, startOffset)
  r.setEnd(endNode, endOffset)
  return r.commonAncestorContainer
}
const findCommonAncestorByManual = (startNode: Node, endNode: Node) => {
  let node = startNode as Node | null
  let startDepth = 0
  while (node) {
    if (node === endNode) {
      return node
    }
    node = node.parentNode
    startDepth++
  }
  node = endNode
  let endDepth = 0
  while (node) {
    if (node === startNode) {
      return node
    }
    node = node.parentNode
    endDepth++
  }
  if (startDepth > endDepth) {
    for (let i = startDepth; i > endDepth; i--) {
      startNode = startNode.parentNode as Node
    }
  }
  else if (endDepth > startDepth) {
    for (let i = endDepth; i > startDepth; i--) {
      endNode = endNode.parentNode as Node
    }
  }
  while (startNode) {
    if (startNode === endNode) {
      return startNode
    }
    startNode = startNode.parentNode as Node
    endNode = endNode.parentNode as Node
  }
  return null
}

// @ts-expect-error no error just dev
window.findCommonAncestorByRange = findCommonAncestorByRange
// @ts-expect-error no error just dev
window.findCommonAncestorByManual = findCommonAncestorByManual
// @ts-expect-error no error just dev
window.countByRange = (startNode: Node, startOffset: number, endNode: Node, endOffset: number, count = 100) => {
  console.log('use range', countCost(() => {
    findCommonAncestorByRange(startNode, startOffset, endNode, endOffset)
  }, count))
}
// @ts-expect-error no error just dev
window.countByManual = (startNode: Node, endNode: Node, count = 100) => {
  console.log('use manual', countCost(() => {
    findCommonAncestorByManual(startNode, endNode)
  }, count))
}
