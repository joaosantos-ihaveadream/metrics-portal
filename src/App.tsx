import { Shell } from './components/Shell'
import { Flow } from './pages/flow/Flow'
import { Health } from './pages/health/Health'
import { Overview } from './pages/overview/Overview'
import { Quality } from './pages/quality/Quality'
import { Placeholder } from './pages/Placeholder'
import { activeNavId, resolve } from './router/routes'
import { usePath } from './router/hashRouter'

export function App() {
  const route = resolve(usePath())
  return (
    <Shell activeId={activeNavId(route)}>
      {route.kind === 'notFound' ? (
        <>
          <h1 className="text-headline-md text-on-surface">Page not found</h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">That link does not match any page.</p>
        </>
      ) : route.kind === 'coming' ? (
        <Placeholder title={route.title} note="Coming soon." />
      ) : route.id === 'overview' ? (
        <Overview />
      ) : route.id === 'health' ? (
        <Health />
      ) : route.id === 'flow' ? (
        <Flow />
      ) : route.id === 'quality' ? (
        <Quality />
      ) : (
        <Placeholder title={route.title} />
      )}
    </Shell>
  )
}
