const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const baselineRef = '53ad1edfffbbdbd67680a843ec7dbf3df4c6fb37'

function prepareBaseline(root) {
  if (process.env.REFACTOR_BASELINE_DIR) return path.resolve(process.env.REFACTOR_BASELINE_DIR)
  const directory = path.join(root, 'test-results/develop-baseline')
  const marker = path.join(directory, '.baseline-ref')
  if (fs.existsSync(marker)) {
    if (fs.readFileSync(marker, 'utf8') !== baselineRef)
      throw new Error('Unexpected baseline reference')
    return directory
  }
  fs.mkdirSync(directory, { recursive: true })
  const archive = path.join(root, 'test-results/develop-baseline.tar')
  execFileSync('git', ['archive', '--format=tar', `--output=${archive}`, baselineRef], {
    cwd: root,
  })
  execFileSync('tar', ['-xf', archive, '-C', directory])
  fs.symlinkSync(
    path.join(root, 'node_modules'),
    path.join(directory, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  fs.writeFileSync(marker, baselineRef)
  return directory
}

module.exports = { prepareBaseline, baselineRef }
