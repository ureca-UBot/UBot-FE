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
const result = { cases: [{ id: 'normal' }], falsePositives: 0, regressions: 0 }
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
  assert.equal(canApprove({ ...result, cases: [] }, selected, selected, [word]), false)
  assert.equal(canApprove(result, selected, selected, [{ ...word, status: 'APPLIED' }]), false)
})
test('묶음 중 일부만 선택해서 적용 금지', () => {
  assert.equal(
    canApprove(result, [...selected, { candidateId: 2, revision: 1 }], selected, [word]),
    false,
  )
})
test('실패 응답은 정상 검사 결과로 해석하지 않음', () => {
  assert.equal(parseValidation('{"error":"FAILED"}'), null)
  assert.equal(parseValidation('not json'), null)
})
