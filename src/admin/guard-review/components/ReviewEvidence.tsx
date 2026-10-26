function objects(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : []
}
function text(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

/** 검토 시점의 복사본입니다. 현재 FAQ를 다시 검색해서 과거 근거로 표시하지 않습니다. */
export function ReviewEvidence({ context }: { context?: Record<string, unknown> }) {
  if (!context || !Object.keys(context).length)
    return <p>당시 근거 자료가 저장되지 않은 기록입니다.</p>
  if (context.snapshot_unavailable)
    return <p>당시 근거 자료를 보존하지 못했습니다. 사실 오류로 확정할 수 없습니다.</p>
  return (
    <div className="review-evidence">
      <h4>검사 당시 문맥·근거</h4>
      {objects(context.provided_faqs).map((faq, index) => (
        <article key={index}>
          <strong>FAQ {text(faq.faqId ?? faq.id)}</strong>
          <p>{text(faq.question)}</p>
          <p className="review-original">{text(faq.answer)}</p>
        </article>
      ))}
      {objects(context.additional_evidence).map((section, index) => (
        <article key={`section-${index}`}>
          <strong>{text(section.title)}</strong>
          <p className="review-original">{text(section.content)}</p>
        </article>
      ))}
      {objects(context.history).length > 0 && (
        <details>
          <summary>검사에 전달된 이전 대화</summary>
          {objects(context.history).map((turn, index) => (
            <article key={index}>
              <p className="review-original">질문: {text(turn.question)}</p>
              <p className="review-original">답변: {text(turn.answer)}</p>
            </article>
          ))}
        </details>
      )}
      {['execution_results', 'store_results', 'tool_records'].map(
        (key) =>
          context[key] != null && (
            <details key={key}>
              <summary>
                {key === 'execution_results'
                  ? '실행된 조회 결과'
                  : key === 'store_results'
                    ? '매장 조회 결과'
                    : '회원 정보 조회 결과'}
              </summary>
              <pre>{JSON.stringify(context[key], null, 2)}</pre>
            </details>
          ),
      )}
    </div>
  )
}
