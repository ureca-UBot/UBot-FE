export interface FaqTableRow {
  id: number
  categoryId: number
  question: string
  version: number
  updatedAt: string | null
}

interface FaqTableProps { faqs: FaqTableRow[] }

export function FaqTable({ faqs }: FaqTableProps) {
  return (
    <div className="faq-table-wrapper">
      <table className="faq-table">
        <thead>
          <tr><th scope="col">ID</th><th scope="col">카테고리 ID</th><th scope="col">질문</th><th scope="col">버전</th><th scope="col">최종 수정일</th></tr>
        </thead>
        <tbody>
          {faqs.map((faq) => (
            <tr key={faq.id}>
              <td>{faq.id}</td>
              <td><span className="faq-table__category">#{faq.categoryId}</span></td>
              <td className="faq-table__question">{faq.question}</td>
              <td>v{faq.version}</td>
              <td>{faq.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
