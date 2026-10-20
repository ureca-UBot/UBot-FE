const { spawn } = require('node:child_process')
const { chromium } = require('playwright')
const path = require('node:path')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function startServer(cwd, port) {
  const origin = `http://127.0.0.1:${port}`
  const server = spawn(
    process.execPath,
    [
      path.join(cwd, 'node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd,
      windowsHide: true,
      stdio: 'pipe',
      env: {
        ...process.env,
        VITE_API_BASE_URL: '',
        VITE_CHAT_MOCK: 'false',
        VITE_KAKAO_JAVASCRIPT_KEY: '',
      },
    },
  )
  let output = ''
  server.stdout.on('data', (data) => {
    output += data
  })
  server.stderr.on('data', (data) => {
    output += data
  })
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(output)
    if (
      await fetch(origin)
        .then((r) => r.ok)
        .catch(() => false)
    )
      return { origin, close: () => server.kill() }
    await sleep(100)
  }
  server.kill()
  throw Error(`Vite did not start: ${output}`)
}

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  })
}

module.exports = { startServer, launchBrowser, sleep }
