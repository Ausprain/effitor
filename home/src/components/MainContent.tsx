import React from 'react'

const MainContent: React.FC = () => {
  return (
    <div className="w-full">
      {/* 标语 */}
      <div className="text-center py-8">
        <p className="text-8xl text-gray-700 dark:text-gray-300">
          An elegant and efficient editor.
        </p>
      </div>

      {/* Try Now 按钮 */}
      <div className="text-center mb-8">
        <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all transform hover:-translate-y-1">
          Try Now
        </button>
      </div>

      {/* 编辑区主体 */}
      <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
        {/* 编辑区内容 */}
        <div className="p-6 min-h-[500px]">
          {/* 这里是编辑区主体，根据ui.txt显示为空白区域 */}
          <div className="w-full h-full bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Editor area</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainContent
