import type { ReactNode } from 'react'
import { MdChevronLeft, MdChevronRight, MdLock } from 'react-icons/md'
import { comingNav, dataNav, deliveryNav, playbookNav, type NavItem } from '../router/routes'
import { href } from '../router/hashRouter'

interface Props {
  activeId: string | null
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Mobile drawer state; ignored from the md breakpoint up. */
  drawerOpen: boolean
  onCloseDrawer: () => void
}

function Section({ title, collapsed, children }: { title: string; collapsed: boolean; children: ReactNode }) {
  return (
    <div className="mt-6">
      {!collapsed && <div className="px-5 pb-2 text-label-md uppercase text-on-primary-container">{title}</div>}
      <ul>{children}</ul>
    </div>
  )
}

function Item({ item, active, collapsed, locked, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; locked?: boolean; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <li>
      <a
        href={href(item.path)}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={[
          'flex items-center gap-3 border-l-4 px-4 py-2.5 text-body-sm transition-colors',
          active
            ? 'border-primary-fixed bg-primary-container text-primary-fixed'
            : 'border-transparent text-on-primary-container hover:bg-primary-container',
          locked ? 'opacity-60' : '',
          collapsed ? 'justify-center' : '',
        ].join(' ')}
      >
        <Icon size={20} aria-hidden />
        {!collapsed && <span className="flex-1">{item.label}</span>}
        {!collapsed && locked && <MdLock size={16} aria-label="Coming soon" />}
      </a>
    </li>
  )
}

export function Sidebar({ activeId, collapsed, onToggleCollapsed, drawerOpen, onCloseDrawer }: Props) {
  // On mobile the sidebar is always full width inside the drawer; collapse only applies from md up.
  const narrow = collapsed
  return (
    <>
      {drawerOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onCloseDrawer} aria-hidden />}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-primary text-on-primary-container transition-transform md:translate-x-0',
          narrow ? 'md:w-20' : 'md:w-[260px]',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Primary"
      >
        <div className={['flex items-center gap-3 border-b border-on-primary-fixed-variant/40 px-5 py-6', narrow ? 'md:justify-center md:px-0' : ''].join(' ')}>
          <img src="/delta-icon-light.svg" alt="Core KPI Hub" className="h-8 w-auto shrink-0" />
          <div className={narrow ? 'md:hidden' : ''}>
            <div className="text-body-md font-semibold text-white">Core KPI Hub</div>
            <div className="text-label-sm text-on-primary-container">Insights &amp; Performance</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pb-4">
          <Section title="Delivery" collapsed={narrow}>
            {deliveryNav.map((i) => (
              <Item key={i.id} item={i} active={activeId === i.id} collapsed={narrow} onNavigate={onCloseDrawer} />
            ))}
          </Section>
          <Section title="KPI Playbook" collapsed={narrow}>
            {playbookNav.map((i) => (
              <Item key={i.id} item={i} active={activeId === i.id} collapsed={narrow} onNavigate={onCloseDrawer} />
            ))}
          </Section>
          <Section title="Coming next" collapsed={narrow}>
            {comingNav.map((i) => (
              <Item key={i.id} item={i} active={activeId === i.id} collapsed={narrow} locked onNavigate={onCloseDrawer} />
            ))}
          </Section>
        </nav>

        <div className="border-t border-on-primary-fixed-variant/40 py-2">
          <ul>
            <Item item={dataNav} active={activeId === dataNav.id} collapsed={narrow} onNavigate={onCloseDrawer} />
          </ul>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={['hidden w-full items-center gap-3 border-l-4 border-transparent px-4 py-2.5 text-left text-body-sm text-on-primary-container hover:bg-primary-container md:flex', narrow ? 'justify-center' : ''].join(' ')}
            title={narrow ? 'Expand sidebar' : undefined}
          >
            {narrow ? <MdChevronRight size={20} aria-hidden /> : <MdChevronLeft size={20} aria-hidden />}
            {!narrow && <span>Collapse sidebar</span>}
            {narrow && <span className="sr-only">Expand sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
