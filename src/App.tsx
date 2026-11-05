import { Shell } from './components/Shell'
import { Placeholder } from './pages/Placeholder'
import { activeNavId, resolve } from './router/routes'
import { usePath } from './router/hashRouter'
import { PageHeader } from './components/PageHeader'

export function App() {
  const route = resolve(usePath())
  return (
    <Shell activeId={activeNavId(route)}>
      {route.kind === 'notFound' ? (
        <PageHeader title="Page not found" subtitle="That link does not match any page." />
      ) : route.kind === 'coming' ? (
        <Placeholder title={route.title} note="Coming soon." />
      ) : (
        <Placeholder title={route.title} />
      )}
    </Shell>
  )
}
