const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')
const source = fs.readFileSync(
  path.join(__dirname, '../src/admin/guard-review/utils/validation.ts'),
  'utf8',
)
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
const box = { exports: {} }
vm.runInNewContext(compiled, box)
const { canApprove, parseValidation } = box.exports
const selected = [{ candidateId: 1, revision: 1 }]
const word = { id: 1, revision: 1, kind: 'WORD', status: 'PENDING' }
const result = {
  baseVersion: 'base',
  datasetVersion: 'gold',
  caseCount: 5168,
  falsePositives: 0,
  regressions: 0,
  baselineFailures: 0,
  newDetections: 0,
}
test('검사를 통과한 동일 버전·전체 묶음만 승인 가능', () => {
  assert.equal(canApprove(result, selected, selected, [word]), true)
})
test('후보 수정 후 이전 검사로 승인 금지', () => {
  assert.equal(
    canApprove(result, selected, [{ candidateId: 1, revision: 2 }], [{ ...word, revision: 2 }]),
    false,
  )
})
test('다른 관리자가 수정한 후보도 승인 금지', () => {
  assert.equal(canApprove(result, selected, selected, [{ ...word, revision: 2 }]), false)
})
test('위험 경고는 승인 대상에 포함되지 않음', () => {
  assert.equal(canApprove(result, selected, selected, [{ ...word, kind: 'WARNING' }]), false)
})
test('정상 오차단·기존 차단 누락이 있으면 승인 금지', () => {
  assert.equal(canApprove({ ...result, falsePositives: 1 }, selected, selected, [word]), false)
  assert.equal(canApprove({ ...result, regressions: 1 }, selected, selected, [word]), false)
})
test('검사 전·빈 결과·이미 적용한 후보 승인 금지', () => {
  assert.equal(canApprove(null, selected, selected, [word]), false)
  assert.equal(canApprove({ ...result, caseCount: 0 }, selected, selected, [word]), false)
  assert.equal(canApprove(result, selected, selected, [{ ...word, status: 'APPLIED' }]), false)
})
test('묶음 중 일부만 선택해서 적용 금지', () => {
  assert.equal(
    canApprove(result, [...selected, { candidateId: 2, revision: 1 }], selected, [word]),
    false,
  )
})
test('실패 응답은 정상 검사 결과로 해석하지 않음', () => {
  assert.equal(parseValidation({ error: 'FAILED' }), null)
  assert.equal(parseValidation('not json'), null)
})

test('새 result 객체의 전체 건수로 판단하고 사례 본문을 요구하지 않는다', () => {
  const summary = parseValidation(result)
  assert.equal(summary.caseCount, 5168)
  assert.equal(Object.hasOwn(summary, 'cases'), false)
  assert.equal(canApprove(summary, selected, selected, [word]), true)
  assert.equal(parseValidation(JSON.stringify(result)), null)
})

test('건수·버전이 없거나 잘못된 요약은 승인 결과로 읽지 않는다', () => {
  for (const invalid of [
    null,
    [],
    {},
    { ...result, caseCount: -1 },
    { ...result, caseCount: 1.5 },
    { ...result, caseCount: '5168' },
    { ...result, falsePositives: Number.NaN },
    { ...result, regressions: -1 },
    { ...result, newDetections: 5169 },
    { ...result, baseVersion: '' },
    { ...result, datasetVersion: 3 },
  ]) {
    assert.equal(parseValidation(invalid), null)
  }
})
