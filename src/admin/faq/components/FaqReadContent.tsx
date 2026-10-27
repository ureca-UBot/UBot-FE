export function FaqReadContent({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="faq-reader">
      <section className="faq-reader__question" aria-label="FAQ 질문">
        <span className="faq-reader__label">질문</span>
        <h3>{question}</h3>
      </section>
      <section className="faq-reader__answer" aria-label="FAQ 답변">
        <span className="faq-reader__label">답변</span>
        <div>{answer}</div>
      </section>
    </div>
  )
}
