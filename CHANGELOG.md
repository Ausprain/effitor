# 变更日志

## 0.2.0-alpha.0

- monorepo重构
- 编辑器对象使用class重构
- 全新上下文系统（编辑器上下文、效应器上下文、插件上下文）
- 编辑器上下文模块划分
- 重构命令系统
- 重构选区系统
- 重构效应系统
- 引入效应码，用于规范文档结构
- 优化“段落顶层”设计，编辑区子节点不再限定为普通段落
- 合并插件效应器，效应器可内联化
- 添加markdown互转，原生html互转
- 编辑器亮暗模式切换
- 分离主题样式到 @effitor/themes 子包
- 插件分为助手插件和内容插件，简称助手和插件
- 内置助手
  - `assist-counter`：字数统计
  - `assist-dialog`：对话框
  - `assist-dropdown`：下拉菜单
  - `assist-message`：消息
  - `assist-popup`：弹窗或悬浮菜单
- 内置插件
  - `plugin-heading`：标题
  - `plugin-mark`：高亮（加粗/斜体/删除线/内敛代码/高亮）
  - `plugin-link`：链接
  - `plugin-list`：列表
  - `plugin-media`：媒体（图片/音/视频）
  - `plugin-code`：代码块
