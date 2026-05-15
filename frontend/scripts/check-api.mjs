#!/usr/bin/env node
/** Fail fast if workbench API is not up (run ./scripts/dev.sh from repo root). */
import { request } from 'node:http'

const port = process.env.AMA_API_PORT || '8800'
const host = process.env.AMA_API_HOST || '127.0.0.1'
const checkHost = host === '0.0.0.0' ? '127.0.0.1' : host

function ping() {
  return new Promise((resolve) => {
    const req = request(
      { hostname: checkHost, port: Number(port), path: '/health', method: 'GET', timeout: 2000 },
      (res) => {
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () => resolve(res.statusCode === 200 && body.includes('ok')))
      },
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.end()
  })
}

const ok = await ping()
if (!ok) {
  console.error(`
Workbench API is not running on http://${checkHost}:${port}/health

Start BOTH services from the repository root:

  ./scripts/dev.sh

Do NOT run only "npm run dev" inside frontend/ — that starts the UI without the API.
`)
  process.exit(1)
}
