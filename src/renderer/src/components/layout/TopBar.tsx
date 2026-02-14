import React from 'react'
import { useUIStore } from '../../store/uiStore'

export function TopBar() {
  const { currentView, setCurrentView, theme, toggleTheme } = useUIStore()

  return (
    <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-gray-900">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">CloudTime</h1>
      </div>

      <div className="flex items-center space-x-2">
        {/* 视图切换 */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setCurrentView('day')}
            className={`px-3 py-1 rounded text-sm ${
              currentView === 'day'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            日
          </button>
          <button
            onClick={() => setCurrentView('week')}
            className={`px-3 py-1 rounded text-sm ${
              currentView === 'week'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            周
          </button>
          <button
            onClick={() => setCurrentView('month')}
            className={`px-3 py-1 rounded text-sm ${
              currentView === 'month'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            月
          </button>
        </div>

        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* 设置 */}
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
          ⚙️
        </button>
      </div>
    </div>
  )
}
