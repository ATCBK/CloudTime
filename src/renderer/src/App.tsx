import React, { useEffect } from 'react'
import { TopBar } from './components/layout/TopBar'
import { IconBar } from './components/layout/IconBar'
import { LeftPanel } from './components/layout/LeftPanel'
import { MainContent } from './components/layout/MainContent'
import { RightPanel } from './components/layout/RightPanel'
import { useUIStore } from './store/uiStore'

function App() {
  const { theme } = useUIStore()

  useEffect(() => {
    // 应用主题到 HTML 元素
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="h-screen w-screen flex flex-col bg-white dark:bg-gray-900">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <IconBar />
        <LeftPanel />
        <MainContent />
        <RightPanel />
      </div>
    </div>
  )
}

export default App
