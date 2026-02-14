import React, { useEffect, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'
import { DraggableTask } from './DraggableTask'

export function TodoList() {
  const { tasks, fetchUnscheduledTasks, createTask } = useTaskStore()
  const { setRightPanelContent, setSelectedTaskId } = useUIStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  useEffect(() => {
    fetchUnscheduledTasks()
  }, [fetchUnscheduledTasks])

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return

    await createTask({
      title: newTaskTitle,
      status: 'todo',
    })

    setNewTaskTitle('')
    setShowCreateForm(false)
    fetchUnscheduledTasks()
  }

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId)
    setRightPanelContent('taskDetail')
  }

  const unscheduledTasks = tasks.filter((task) => !task.scheduledDate && task.status !== 'completed')

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* 分类标题 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            未安排的任务
          </h3>
          <div className="space-y-2">
            {unscheduledTasks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">暂无待办任务</p>
            ) : (
              unscheduledTasks.map((task) => (
                <DraggableTask
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* 创建任务 */}
        {showCreateForm ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
              placeholder="任务标题"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCreateTask}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewTaskTitle('')
                }}
                className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 新建任务
          </button>
        )}
      </div>
    </DndProvider>
  )
}
