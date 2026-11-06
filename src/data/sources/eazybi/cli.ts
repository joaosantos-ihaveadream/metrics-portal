import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { generateMockDataset } from '../mock/generate'
import { ConversionError, convertExports, formatSummary, validateTeams, type ColumnConfig } from './convert'
import { parseDate } from './dates'
import { makeSampleExports } from './sample'

const DIR = 'eazybi-data'
const OUT = 'public/data/snapshot.json'

function read(path: string): string {
  if (!existsSync(path)) throw new ConversionError(`${path}: file not found.`)
  return readFileSync(path, 'utf8')
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(read(path))
  } catch (e) {
    if (e instanceof ConversionError) throw e
    throw new ConversionError(`${path}: not valid JSON.`)
  }
}

function option(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

/** `npm run snapshot` / `npm run snapshot:sample`. Returns the exit code. */
export function main(args: string[]): number {
  try {
    const verbose = args.includes('--verbose')
    const asOfArg = option(args, '--as-of')
    const asOf = asOfArg ? parseDate(asOfArg) : new Date().toISOString()
    if (!asOf) throw new ConversionError('--as-of: unrecognised date, expected yyyy-mm-dd or ISO.')

    let dir = option(args, '--dir') ?? DIR
    if (args.includes('--sample')) {
      dir = join(dir, 'sample')
      const sample = makeSampleExports(generateMockDataset())
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'issues.csv'), sample.issuesCsv)
      writeFileSync(join(dir, 'sprints.csv'), sample.sprintsCsv)
      writeFileSync(join(dir, 'squads.json'), JSON.stringify(sample.teams, null, 2))
      console.log(`Wrote fictional sample exports to ${dir}/`)
    }

    const columnsPath = join(dir, 'columns.json')
    const config = existsSync(columnsPath) ? (readJson(columnsPath) as ColumnConfig) : undefined
    const { dataset, summary } = convertExports({
      issuesCsv: read(join(dir, 'issues.csv')),
      sprintsCsv: read(join(dir, 'sprints.csv')),
      teams: validateTeams(readJson(join(dir, 'squads.json'))),
      config,
      asOf: args.includes('--sample') && !asOfArg ? generateMockDataset().asOf : asOf,
    })
    const out = option(args, '--out') ?? OUT
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, JSON.stringify(dataset))
    console.log(formatSummary(summary, verbose))
    console.log(`Snapshot written to ${out}`)
    console.log('Set VITE_DATA_SOURCE=eazybi and VITE_SNAPSHOT_URL=./data/snapshot.json in .env.local to use it.')
    return 0
  } catch (e) {
    if (e instanceof ConversionError) {
      console.error(`Error: ${e.message}`)
      return 1
    }
    throw e
  }
}
