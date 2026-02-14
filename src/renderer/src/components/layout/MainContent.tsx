import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { format } from 'date-fns'

export function MainContent() {
  const { currentView, currentDate } = useUIStore()

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-800 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {format(new Date(currentDate), 'yyyy年MM月dd日 EEEE', { locale: undefined })}
          </h2>
        </div>

        {currentView === 'day' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <p className="text-gray-500 dark:text-gray-400">日视图 - 时间轴(待实现)</p>
          </div>
        )}

        {currentView === 'week' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <p className="text-gray-500 dark:text-gray-400">周视图(待实现)</p>
          </div>
        )}

        {currentView === 'month' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <p className="text-gray-500 dark:text-gray-400">月视图(待实现)</p>
          </div>
        )}
      </div>
    </div>
  )
}
