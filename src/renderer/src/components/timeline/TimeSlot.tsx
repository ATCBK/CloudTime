import React from 'react'
import { useDrop } from 'react-dnd'
import { useTaskStore } from '../../store/taskStore'
import { Task } from '../../../../shared/types'

interface TimeSlotProps {
  hour: number
  date: string
  tasks: Task[]
}

export function TimeSlot({ hour, date, tasks }: TimeSlotProps) {
  const { updateTask } = useTaskStore()

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: { task: Task }) => {
      const time = `${hour.toString().padStart(2, '0')}:00`
      updateTask(item.task.id, {
        scheduledDate: date,
        scheduledTime: time,
      })
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }))

  const slotTasks = tasks.filter((task) => {
    if (!task.scheduledTime) return false
    const taskHour = parseInt(task.scheduledTime.split(':')[0])
    return taskHour === hour
  })

  return (
    <div
      ref={drop}
      className={`border-b border-gray-200 dark:border-gray-700 min-h-[60px] p-2 ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <div className="flex items-start space-x-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 w-12">
          {hour.toString().padStart(2, '0')}:00
        </span>
        <div className="flex-1 space-y-1">
          {slotTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-3 py-2 rounded text-sm">
      {task.title}
    </div>
  )
}
