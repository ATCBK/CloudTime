import React, { useEffect, useState } from 'react'
import { useInspirationStore } from '../../store/inspirationStore'
import { useUIStore } from '../../store/uiStore'
import { format } from 'date-fns'

export function InspirationPanel() {
  const { inspirations, fetchByDate, create, delete: deleteInspiration } = useInspirationStore()
  const { currentDate } = useUIStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newContent, setNewContent] = useState('')

  useEffect(() => {
    fetchByDate(currentDate)
  }, [currentDate, fetchByDate])

  const handleCreate = async () => {
    if (!newContent.trim()) return

    await create(newContent, currentDate)
    setNewContent('')
    setShowCreateForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {format(new Date(currentDate), 'yyyy年MM月dd日')}
        </p>
      </div>

      {showCreateForm ? (
        <div className="space-y-2">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="记录你的灵感..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleCreate}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              保存
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false)
                setNewContent('')
              }}
              className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 text-sm"
        >
          + 添加灵感
        </button>
      )}

      <div className="space-y-3">
        {inspirations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            暂无灵感记录
          </p>
        ) : (
          inspirations.map((inspiration) => (
            <div
              key={inspiration.id}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {inspiration.content}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {format(new Date(inspiration.createdAt), 'HH:mm')}
                </span>
                <button
                  onClick={() => deleteInspiration(inspiration.id)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
