import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { InspirationPanel } from '../inspiration/InspirationPanel'

export function RightPanel() {
  const { rightPanelContent } = useUIStore()

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {rightPanelContent === 'inspiration' && '📝 今日灵感'}
          {rightPanelContent === 'taskDetail' && '📋 任务详情'}
          {rightPanelContent === 'noteEditor' && '📝 笔记编辑'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {rightPanelContent === 'inspiration' && <InspirationPanel />}

        {rightPanelContent === 'taskDetail' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">请选择一个任务查看详情</p>
          </div>
        )}

        {rightPanelContent === 'noteEditor' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">请选择一个笔记进行编辑</p>
          </div>
        )}
      </div>
    </div>
  )
}
