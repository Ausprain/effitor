# 0.1.0
## Bug Fixes
- [x] issues.2 `Backspace`删除块级符开头`&ZeroWidthSpace;`时异常，与预期不符，可能与`modify()`有关
  - orig. `modify`移动一个`Character`无法跨越换行或`display::block`节点，导致删除判定为【同段落跨节点删除】`or`【跨段落删除】，然后整体删除、合并
- [x] issues.1 `markPlugin`: 撤销临时节点时前一个字符也被删除了
  - orig. 忘记`skipDefault`
## Features
- [x] 编辑：若删除文本后节点仅剩零宽字符，则连同该节点（以及以其为唯一节点的祖先）一起删除，并合并前后可合并节点
- [ ] 笔记数据：内容（`json`）与展示（`html`）的相互转换
