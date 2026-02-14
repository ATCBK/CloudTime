import React from 'react'
import { useUIStore } from '../../store/uiStore'

export function IconBar() {
  const { leftPanelContent, setLeftPanelContent, setLeftPanelOpen } = useUIStore()

  const handleIconClick = (content: 'todo' | 'note' | 'settings') => {
    if (leftPanelContent === content) {
      setLeftPanelOpen(false)
      setLeftPanelContent(null)
    } else {
      setLeftPanelOpen(true)
      setLeftPanelContent(content)
    }
  }

  return (
    <div className="w-12 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 space-y-4">
      <button
        onClick={() => handleIconClick('todo')}
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
          leftPanelContent === 'todo'
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
        title="待办"
      >
        📋
      </button>

      <button
        onClick={() => handleIconClick('note')}
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
          leftPanelContent === 'note'
            : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
        title="笔记"
      >
        📝
      </button>

      <button
        onClick={() => handleIconClick('settings')}
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
          leftPanelContent === 'settings'
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
        title="设置"
      >
        ⚙️
      </button>
    </div>
  )
}
