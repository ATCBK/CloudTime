import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { TodoList } from '../todo/TodoList'

export function LeftPanel() {
  const { leftPanelOpen, leftPanelContent } = useUIStore()

  if (!leftPanelOpen || !leftPanelContent) {
    return null
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {leftPanelContent === 'todo' && '待办列表'}
          {leftPanelContent === 'note' && '笔记'}
          {leftPanelContent === 'settings' && '设置'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {leftPanelContent === 'todo' && <TodoList />}

        {leftPanelContent === 'note' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无笔记</p>
            <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + 新建笔记
            </button>
          </div>
        )}

        {leftPanelContent === 'settings' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                主题
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option>浅色</option>
                <option>深色</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
