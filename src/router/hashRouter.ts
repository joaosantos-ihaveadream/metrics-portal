import { useEffect, useState } from 'react'

/** Current hash path, e.g. "/health". Empty hash is "/". */
function readPath(): string {
  const raw = window.location.hash.replace(/^#/, '')
  const path = raw.split('?')[0]
  return path === '' ? '/' : path
}

export function usePath(): string {
  const [path, setPath] = useState(readPath)
  useEffect(() => {
    const onChange = () => {
      setPath(readPath())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return path
}

export function href(path: string): string {
  return `#${path}`
}
