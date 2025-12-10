import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'

// 文档数据，后续将从 /docs 目录动态加载
const docsData = {
  nav: [
    {
      title: '指南',
      items: [
        { slug: 'getting-started', title: '快速开始' },
        { slug: 'installation', title: '安装' },
        { slug: 'basic-usage', title: '基本使用' },
      ],
    },
    {
      title: '核心概念',
      items: [
        { slug: 'architecture', title: '架构设计' },
        { slug: 'editor-context', title: '编辑器上下文' },
        { slug: 'effect-elements', title: '效应元素' },
        { slug: 'plugins', title: '插件系统' },
      ],
    },
    {
      title: 'API',
      items: [
        { slug: 'effitor-class', title: 'Effitor 类' },
        { slug: 'editor-context', title: 'EditorContext' },
        { slug: 'configuration', title: '配置选项' },
      ],
    },
  ],
  // 模拟文档内容，后续将从 /docs 目录动态加载
  content: {
    'getting-started': {
      title: '快速开始',
      body: `<h2>欢迎使用 Effitor</h2>
<p>Effitor 是一个现代化的富文本编辑器，基于原生 Web 技术构建，提供了强大的编辑体验和灵活的扩展能力。</p>

<h3>安装</h3>
<pre><code>npm install @effitor/core
</code></pre>

<h3>基本使用</h3>
<pre><code>import { Effitor } from '@effitor/core'

const editor = new Effitor()
editor.mount(document.getElementById('editor-container'))
</code></pre>

<p>这样就可以在页面上创建一个简单的编辑器实例。</p>`,
    },
    'architecture': {
      title: '架构设计',
      body: `<h2>Effitor 架构设计</h2>
<p>Effitor 采用了模块化的架构设计，主要包含以下核心模块：</p>

<ul>
  <li><strong>编辑器核心</strong>：负责编辑器的初始化、挂载和状态管理</li>
  <li><strong>效应器系统</strong>：处理各种用户输入事件</li>
  <li><strong>元素系统</strong>：定义编辑器中的各种元素类型</li>
  <li><strong>处理器系统</strong>：处理命令和编辑操作</li>
  <li><strong>插件系统</strong>：提供扩展编辑器功能的能力</li>
</ul>

<p>这种模块化设计使得 Effitor 具有良好的可扩展性和可维护性，可以根据需要灵活扩展各种功能。</p>`,
    },
  },
}

const Docs: React.FC = () => {
  const { slug = 'getting-started' } = useParams<{ slug: string }>()
  const [activeSlug, setActiveSlug] = useState(slug)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    // 当URL中的slug变化时，更新activeSlug
    setActiveSlug(slug)
  }, [slug])

  useEffect(() => {
    // 后续将从 /docs 目录动态加载文档内容
  }, [])

  const currentDoc = docsData.content[activeSlug as keyof typeof docsData.content] || docsData.content['getting-started']

  return (
    <div className="pb-16 mx-auto min-h-screen max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 侧边导航 - 桌面端 */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <h2 className="text-2xl font-bold mb-6 bg-linear-to-tr from-[#6671e7] to-[#9921e7] bg-clip-text text-transparent">
              Effitor 文档
            </h2>
            <nav>
              {docsData.nav.map((section, index) => (
                <div key={index} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map(item => (
                      <li key={item.slug}>
                        <Link
                          to={`/docs/${item.slug}`}
                          onClick={() => setActiveSlug(item.slug)}
                          className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeSlug === item.slug
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* 移动端菜单按钮 */}
        <div className="lg:hidden flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-linear-to-tr from-[#6671e7] to-[#9921e7] bg-clip-text text-transparent">
            Effitor 文档
          </h2>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen
                ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )
                : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
            </svg>
          </button>
        </div>

        {/* 移动端菜单 */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <nav>
              {docsData.nav.map((section, index) => (
                <div key={index} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map(item => (
                      <li key={item.slug}>
                        <Link
                          to={`/docs/${item.slug}`}
                          onClick={() => {
                            setActiveSlug(item.slug)
                            setIsMobileMenuOpen(false)
                          }}
                          className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeSlug === item.slug
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        )}

        {/* 主内容区域 */}
        <main className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 transition-colors">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
              {currentDoc.title}
            </h1>
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentDoc.body) }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Docs
