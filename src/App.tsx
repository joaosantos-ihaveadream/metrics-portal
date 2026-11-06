import { Shell } from './components/Shell'
import { ComingSoon } from './pages/coming/ComingSoon'
import { DataSources } from './pages/data/DataSources'
import { Flow } from './pages/flow/Flow'
import { Health } from './pages/health/Health'
import { MetricCatalogue } from './pages/metrics/MetricCatalogue'
import { Overview } from './pages/overview/Overview'
import { Quality } from './pages/quality/Quality'
import { TeamDetail } from './pages/teams/TeamDetail'
import { Teams } from './pages/teams/Teams'
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
        <ComingSoon id={route.id} title={route.title} />
      ) : route.id === 'overview' ? (
        <Overview />
      ) : route.id === 'health' ? (
        <Health />
      ) : route.id === 'flow' ? (
        <Flow />
      ) : route.id === 'quality' ? (
        <Quality />
      ) : route.id === 'teams' ? (
        <Teams />
      ) : route.id === 'team-detail' ? (
        <TeamDetail id={route.params.id} />
      ) : route.id === 'metrics' ? (
        <MetricCatalogue />
      ) : (
        <DataSources />
      )}
    </Shell>
  )
}
