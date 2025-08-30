// import { Et } from '../@types'

// /**
//  * 已连接的Range, 该类实例静态地指向页面内的一个真实范围;
//  * 创建后若 DOM 结构发生改变, 该实例可能失效
//  */
// export class ConnectedRange<CommonAncestorType extends Et.HTMLNode> implements Et.StaticRange {
//   public readonly collapsed: boolean
//   public readonly endContainer: Et.HTMLNode
//   public readonly endOffset: number
//   public readonly startContainer: Et.HTMLNode
//   public readonly startOffset: number
//   public readonly commonAncestor: CommonAncestorType

//   private _startAncestor: Et.NullableHTMLNode = null
//   private _endAncestor: Et.NullableHTMLNode = null

//   // FIXME 有一种情况  startAncestor 会为空
//   // 即一个空的 contenteditable 的 p 元素, 设置了 min-height, 让光标得以落入其中
//   // 此时选区 collapsed, startContainer == endContainer == commonAncestor
//   // 若选区非collapsed, 则只有一种情况会导致 startAncestor 为空, 即 commonAncestor 是文本节点
//   get startAncestor() {
//     if (this._startAncestor) {
//       return this._startAncestor
//     }
//     if (this.startContainer === this.commonAncestor) {
//       this._startAncestor = this.commonAncestor.childNodes.item(this.startOffset) as Et.HTMLNode
//     }
//     else {
//       this._startAncestor = ConnectedRange.outerNodeUnder(this.startContainer, this.commonAncestor)
//     }
//     return this._startAncestor
//   }

//   get endAncestor() {
//     if (this._endAncestor) {
//       return this._endAncestor
//     }
//     if (this.endContainer === this.commonAncestor) {
//       this._endAncestor = this.commonAncestor.childNodes.item(this.endOffset - 1) as Et.HTMLNode
//     }
//     else {
//       this._endAncestor = ConnectedRange.outerNodeUnder(this.endContainer, this.commonAncestor)
//     }
//     return this._endAncestor
//   }

//   private constructor(
//     sr: Et.StaticRange,
//     commonAncestor: CommonAncestorType,
//   ) {
//     this.collapsed = sr.collapsed
//     this.endContainer = sr.endContainer
//     this.endOffset = sr.endOffset
//     this.startContainer = sr.startContainer
//     this.startOffset = sr.startOffset
//     this.commonAncestor = commonAncestor
//   }

//   /**
//    * 从Range对象创建一个 ConnectedRange 实例
//    */
//   static fromRange(range: Et.Range) {
//     const commonAncestor = range.commonAncestorContainer
//     return new ConnectedRange(range, commonAncestor)
//   }

//   /**
//    * 创建一个 ConnectedRange 实例
//    * @param root 范围根节点, 指定更小的根节点可以缩小公共祖先的查找范围, 加快查找速度
//    */
//   static create<CommonAncestorType extends Et.HTMLNode>(
//     sr: Et.StaticRange, root?: Et.HTMLElement) {
//     if (sr.collapsed || !sr.endContainer.isConnected || !sr.startContainer.isConnected) {
//       return null
//     }
//     const commonAncestor = this.findCommonAncestor(
//       sr.startContainer, sr.endContainer, root) as CommonAncestorType
//     if (!commonAncestor) {
//       return null
//     }
//     return new ConnectedRange<CommonAncestorType>(sr, commonAncestor)
//   }

//   /**
//    * node 必须是 under 的后代
//    */
//   static outerNodeUnder(node: Et.HTMLNode, under: Et.HTMLNode) {
//     let p = node.parentNode
//     while (p && p !== under) {
//       node = p
//       p = p.parentNode
//     }
//     return node
//   }

//   /**
//    * 获取一个范围的起止位置在公共祖先下的最外层节点, 范围必须非collapsed, 否则返回结果可能含 null
//    */
//   static outerNodeOfRange(sr: Et.StaticRange, commonAncestor: Et.HTMLNode) {
//     let startOuter, endOuter
//     if (sr.startContainer === commonAncestor) {
//       startOuter = commonAncestor.childNodes.item(sr.startOffset) as Et.HTMLNode
//     }
//     if (sr.endContainer === commonAncestor) {
//       // 范围选到节点的外末尾, 则索引所在节点不应视为被包含, endOuter 为索引前一个节点
//       endOuter = commonAncestor.childNodes.item(sr.endOffset - 1) as Et.HTMLNode
//     }
//     if (!startOuter) {
//       startOuter = this.outerNodeUnder(sr.startContainer, commonAncestor)
//     }
//     if (!endOuter) {
//       endOuter = this.outerNodeUnder(sr.endContainer, commonAncestor)
//     }
//     return [startOuter, endOuter]
//   }

//   /**
//    * 查找两个节点的最近公共祖先节点
//    * @param stopNode 停止查找的节点, 默认为document.body
//    */
//   static findCommonAncestor(
//     oneNode: Et.HTMLNode,
//     otherNode: Et.HTMLNode,
//     stopNode = document.body,
//   ) {
//     let node = oneNode as Et.NullableHTMLNode
//     let startDepth = 0
//     while (node && node !== stopNode) {
//       if (node === otherNode) {
//         return node
//       }
//       node = node.parentNode
//       startDepth++
//     }
//     node = otherNode
//     let endDepth = 0
//     while (node && node !== stopNode) {
//       if (node === oneNode) {
//         return node
//       }
//       node = node.parentNode
//       endDepth++
//     }
//     if (startDepth > endDepth) {
//       for (let i = startDepth; i > endDepth; i--) {
//         oneNode = oneNode.parentNode as Et.HTMLNode
//       }
//     }
//     else if (endDepth > startDepth) {
//       for (let i = endDepth; i > startDepth; i--) {
//         otherNode = otherNode.parentNode as Et.HTMLNode
//       }
//     }
//     while (oneNode && oneNode !== stopNode) {
//       if (oneNode === otherNode) {
//         return oneNode
//       }
//       oneNode = oneNode.parentNode as Et.HTMLNode
//       otherNode = otherNode.parentNode as Et.HTMLNode
//     }
//     return stopNode
//   }
// }
