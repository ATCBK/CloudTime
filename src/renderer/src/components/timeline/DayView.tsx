import React, { useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TimeSlot } from './TimeSlot'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'

export function DayView() {
  const { tasks, fetchTasksByDate } = useTaskStore()
  const { currentDate } = useUIStore()

  useEffect(() => {
    fetchTasksByDate(currentDate)
  }, [currentDate, fetchTasksByDate])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">时间轴</h3>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
          {hours.map((hour) => (
            <TimeSlot key={hour} hour={hour} date={currentDate} tasks={tasks} />
          ))}
        </div>
      </div>
    </DndProvider>
  )
}
