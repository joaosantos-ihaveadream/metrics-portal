import { Shell } from './components/Shell'
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
      ) : (
        <Placeholder title={route.title} />
      )}
    </Shell>
  )
}
