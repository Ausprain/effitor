import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { HomeFooter } from './components/footer'
import Docs from './pages/Docs'
import Home from './pages/Home'

const App: React.FC = () => {
  return (
    <div className="pt-24
    bg-linear-to-br
    from-blue-50 to-indigo-100
    dark:from-gray-900 dark:to-indigo-950
    transition-colors"
    >
      {/* 主内容区域 - 路由配置 */}
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />
        <Route path="/docs/:slug" element={<Docs />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
      <HomeFooter />
    </div>
  )
}

export default App
