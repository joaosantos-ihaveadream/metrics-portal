import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Banner } from './Banner'
import { InsightDock } from './InsightDock'

export function Shell({ activeId, children }: { activeId: string | null; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        activeId={activeId}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
      />
      <div className={['transition-[padding]', collapsed ? 'md:pl-20' : 'md:pl-[260px]'].join(' ')}>
        <TopBar onOpenDrawer={() => setDrawerOpen(true)} />
        <Banner />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8">{children}</main>
        <InsightDock />
      </div>
    </div>
  )
}
