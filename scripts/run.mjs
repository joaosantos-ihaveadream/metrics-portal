// Runs the TypeScript converter through Vite's module loader, so it shares code with the app.
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', configFile: false })
let code = 1
try {
  const { main } = await server.ssrLoadModule('/src/data/sources/eazybi/cli.ts')
  code = main(process.argv.slice(2))
} finally {
  await server.close()
}
process.exit(code)
