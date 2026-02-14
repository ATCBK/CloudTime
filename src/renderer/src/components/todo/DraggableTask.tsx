import React from 'react'
import { useDrag } from 'react-dnd'
import { Task } from '../../../../shared/types'

interface DraggableTaskProps {
  task: Task
  onClick?: () => void
}

export function DraggableTask({ task, onClick }: DraggableTaskProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const getCategoryColor = (categoryId?: string) => {
    switch (categoryId) {
      case 'study':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
      case 'life':
        return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100'
      case 'work':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
    }
  }

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`p-3 rounded-lg cursor-move ${getCategoryColor(task.categoryId)} ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium">{task.title}</h4>
          {task.description && (
            <p className="text-sm opacity-75 mt-1">{task.description}</p>
          )}
        </div>
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={(e) => e.stopPropagation()}
          className="ml-2"
        />
      </div>
    </div>
  )
}
