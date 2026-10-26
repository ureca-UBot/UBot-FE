const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')
const filterSource = fs.readFileSync(
  path.join(__dirname, '../src/admin/guard-review/utils/filters.ts'),
  'utf8',
)
const filterBox = { exports: {}, URLSearchParams }
vm.runInNewContext(
  ts.transpileModule(filterSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
    .outputText,
  filterBox,
)
test('검사 필터는 출처와 판정을 AND로 전달하고 출력 LLM 통과는 실제 PASS만 요청한다', () => {
  const { filterQuery, outputLlmPreset, outcomeLabel } = filterBox.exports
  assert.equal(filterQuery(outputLlmPreset('PASS')), '&origin=OUTPUT_LLM&outcome=PASS')
  assert.equal(filterQuery(outputLlmPreset('REJECTED')), '&origin=OUTPUT_LLM&outcome=REJECTED')
  assert.equal(filterQuery({}), '')
  assert.equal(outcomeLabel('SKIPPED'), '검사 생략')
  assert.equal(outcomeLabel('ERROR'), '검사 오류')
  assert.equal(outcomeLabel('REVIEW'), '판정 보류')
})

test('다중 출처와 결과를 빠짐없이 전달하고 중복 선택은 한 번만 보낸다', () => {
  const query = new URLSearchParams(
    filterBox.exports
      .filterQuery({
        origins: ['INPUT_LLM', 'OUTPUT_LLM', 'INPUT_LLM'],
        outcomes: ['REVIEW', 'REJECTED'],
      })
      .slice(1),
  )
  assert.deepEqual(query.getAll('origins'), ['INPUT_LLM', 'OUTPUT_LLM'])
  assert.deepEqual(query.getAll('outcomes'), ['REVIEW', 'REJECTED'])
  assert.equal(filterBox.exports.filterQuery({ origins: [], outcomes: [] }), '')
})

test('생략 요약은 누락된 출처로 오해하지 않게 표시하고 분석 선택에서 제외한다', () => {
  const check = {
    origin: 'UNKNOWN',
    outcome: 'SKIPPED',
    detailsRetained: true,
    question: '질문',
    skippedOrigins: ['INPUT_LLM', 'OUTPUT_LLM'],
  }
  assert.equal(filterBox.exports.checkOriginLabel(check), '검사 생략 요약')
  assert.equal(filterBox.exports.skippedCheckLabels(check), '입력 LLM 가드 · 출력 LLM 가드')
  assert.equal(filterBox.exports.canAnalyzeCheck(check), false)
  const actual = { ...check, origin: 'INPUT_LLM', outcome: 'REVIEW' }
  assert.equal(filterBox.exports.canAnalyzeCheck(actual), true)
  assert.equal(filterBox.exports.canAnalyzeCheck({ ...actual, detailsRetained: false }), false)
  assert.equal(filterBox.exports.canAnalyzeCheck({ ...actual, question: null }), false)
})
function loadReviewComponent(file) {
  const component = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/admin/guard-review/components', file), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    },
  ).outputText
  const result = {
    exports: {},
    require: (name) => (name === '../utils/filters' ? filterBox.exports : require(name)),
  }
  vm.runInNewContext(component, result)
  return result.exports
}
test('당시 FAQ와 입력 문맥을 표시하고 HTML 원문을 실행하지 않는다', () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const { ReviewEvidence } = loadReviewComponent('ReviewEvidence.tsx')
  const html = renderToStaticMarkup(
    React.createElement(ReviewEvidence, {
      context: {
        provided_faqs: [
          { faqId: 7, question: '공식 요금', answer: '월 5000원 <script>alert(1)</script>' },
        ],
        history: [{ question: '이전 질문', answer: '이전 답변' }],
      },
    }),
  )
  assert.ok(html.includes('FAQ 7'))
  assert.ok(html.includes('월 5000원'))
  assert.ok(html.includes('이전 질문'))
  assert.ok(!html.includes('<script>'))
})
test('실제 통과·차단과 생략·보류·오류를 서로 다른 옵션으로 표시한다', () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const { ReviewSourceFilters } = loadReviewComponent('ReviewSourceFilters.tsx')
  const html = renderToStaticMarkup(
    React.createElement(ReviewSourceFilters, {
      value: { origin: 'OUTPUT_LLM', outcome: 'PASS' },
      onChange() {},
    }),
  )
  for (const text of ['출력 LLM 가드', '차단', '검사 생략', '판정 보류', '검사 오류'])
    assert.ok(html.includes(text))
  assert.ok(html.includes('value="OUTPUT_LLM" selected'))
  assert.ok(html.includes('value="PASS" selected'))
})

test('다중 선택 UI는 출처와 결과를 독립된 체크박스 그룹으로 표시한다', () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const { ReviewSourceFilters } = loadReviewComponent('ReviewSourceFilters.tsx')
  const html = renderToStaticMarkup(
    React.createElement(ReviewSourceFilters, {
      multiple: true,
      value: { origins: ['INPUT_LLM', 'OUTPUT_LLM'], outcomes: ['REVIEW', 'REJECTED'] },
      onChange() {},
    }),
  )
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 12)
  assert.equal((html.match(/checked=""/g) ?? []).length, 4)
  assert.ok(html.includes('전체 출처'))
  assert.ok(html.includes('전체 결과'))
  assert.ok(html.includes('여러 개 선택'))
})
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

const runStatusSource = fs.readFileSync(
  path.join(__dirname, '../src/admin/guard-review/utils/runStatus.ts'),
  'utf8',
)
const runStatusBox = { exports: {} }
vm.runInNewContext(
  ts.transpileModule(runStatusSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
    .outputText,
  runStatusBox,
)
const { describeRun, shortSourceKey, errorReason } = runStatusBox.exports
const analysis = (status, result) => ({
  id: 1,
  kind: 'ANALYSIS',
  status,
  processed: 0,
  total: 10,
  result,
  createdAt: '2026-10-23T09:00:00',
})
test('일시 오류로 재시도를 기다리는 분석은 실패 횟수와 사유를 보여 줌', () => {
  const detail = describeRun(
    analysis('RUNNING', {
      consecutiveFailures: 2,
      retryAt: '2026-10-23T09:00:30',
      errorCode: 'LLM_TIMEOUT',
      completed: 4,
      failed: 0,
      pending: 6,
    }),
  )
  assert.equal(detail.tone, 'warning')
  assert.match(detail.text, /모델 응답 시간 초과 \(2\/3회 실패\)/)
  assert.match(detail.text, /^자동 재시도 대기/)
  assert.match(detail.text, /이후 재시도/)
  assert.doesNotMatch(detail.text, /최종 실패/)
  assert.match(detail.text, /완료 4건 · 실패 0건 · 남음 6건/)
})
test('3회 실패로 중단된 분석은 사유와 재개 안내를 보여 줌', () => {
  const detail = describeRun(
    analysis('FAILED', {
      errorCode: 'LLM_SERVICE_UNAVAILABLE',
      error: 'REVIEW_FAILED',
      completed: 4,
      failed: 1,
      pending: 5,
    }),
  )
  assert.equal(detail.tone, 'danger')
  assert.match(detail.text, /모델 서버에 연결하지 못함/)
  assert.match(detail.text, /^최종 실패 · 분석 중단/)
  assert.doesNotMatch(detail.text, /자동 재시도/)
  assert.match(detail.text, /완료 4건 · 실패 1건 · 남음 5건/)
  assert.match(detail.hint, /재개하면 남은 항목부터/)
})
test('상세 보관이 만료된 실패 실행에는 재개 안내를 하지 않음', () => {
  const detail = describeRun({
    ...analysis('FAILED', { error: 'REVIEW_FAILED', completed: 1, failed: 1, pending: 0 }),
    detailsRetained: false,
  })
  assert.equal(detail.hint, undefined)
  assert.match(detail.text, /분석 중단/)
})
test('항목 단위 실패로 끝난 실행은 중단과 구분하고 실패 항목 재처리를 안내', () => {
  const detail = describeRun(analysis('FAILED', { completed: 8, failed: 2, pending: 0 }))
  assert.match(detail.text, /^일부 항목 실패/)
  assert.doesNotMatch(detail.text, /분석 중단/)
  assert.match(detail.hint, /실패한 항목을 다시 처리/)
})
test('처리 건수에 실패 건이 포함돼도 완료 건수는 result 값만 사용', () => {
  const run = analysis('FAILED', { error: 'REVIEW_FAILED', completed: 4, failed: 1, pending: 5 })
  assert.match(describeRun({ ...run, processed: 5 }).text, /완료 4건/)
  assert.doesNotMatch(describeRun({ ...run, processed: 5 }).text, /완료 5건/)
})
test('진행 중·완료 분석은 건수만 보여 주고 정보가 없으면 아무것도 보여 주지 않음', () => {
  assert.equal(
    describeRun(analysis('RUNNING', { completed: 3, failed: 0, pending: 7 })).text,
    '완료 3건 · 실패 0건 · 남음 7건',
  )
  assert.equal(describeRun(analysis('QUEUED', {})), null)
  assert.equal(describeRun(analysis('COMPLETED', {})), null)
})
test('서버 결과 형식이 달라도 예외 없이 처리', () => {
  assert.equal(describeRun(analysis('RUNNING', { completed: 'x', pending: -1 })), null)
  assert.doesNotThrow(() => describeRun({ ...analysis('FAILED', {}), result: null }))
  assert.equal(describeRun(analysis('FAILED', {})).tone, 'danger')
})
test('실패한 오차단 검사는 다시 검사하도록 안내', () => {
  const run = { ...analysis('FAILED', { error: 'REVIEW_FAILED' }), kind: 'VALIDATION' }
  assert.match(describeRun(run).text, /다시 검사/)
  assert.equal(describeRun({ ...run, status: 'COMPLETED' }), null)
})
test('알 수 없는 오류 코드는 일반 문구로 보여 주고 코드가 없으면 null', () => {
  assert.equal(errorReason('SOMETHING_NEW'), '알 수 없는 오류')
  assert.equal(errorReason(null), null)
})
test('원본 식별자 해시는 앞 8자만 보여 주고 다른 형식은 그대로 둠', () => {
  const hash = 'sha256:' + 'ab12cd34'.repeat(8)
  assert.equal(shortSourceKey(hash), 'sha256:ab12cd34…')
  assert.equal(shortSourceKey('legacy-key'), 'legacy-key')
})
