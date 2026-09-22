import { useEffect, useState } from 'react'
import { adminFaqApi } from '../../faq/api/faqApi'
import type { FaqResponse } from '../../faq/types/faq'

export function DeletedFaqListPage() {
  const [items, setItems] = useState<FaqResponse[]>([]); const [error, setError] = useState<string | null>(null)
  useEffect(() => { void adminFaqApi.getDeletedFaqList().then((r) => setItems(r.content)).catch((e: unknown) => setError(e instanceof Error ? e.message : '조회 실패')) }, [])
  if (error) return <p className="page-message page-message--error">{error}</p>
  return <div className="faq-table-wrapper"><table className="faq-table"><thead><tr><th>ID</th><th>질문</th><th>버전</th></tr></thead><tbody>{items.map((faq) => <tr key={faq.id}><td>{faq.id}</td><td>{faq.question}</td><td>v{faq.version}</td></tr>)}</tbody></table></div>
}
