import { useEffect, useState } from 'react'
import { adminFaqApi } from '../../faq/api/faqApi'
import type { FaqResponse } from '../../faq/types/faq'

export function DeletedFaqListPage() {
  const [items, setItems] = useState<FaqResponse[]>([]); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null); const [restoringId, setRestoringId] = useState<number | null>(null)
  function load() { void adminFaqApi.getDeletedFaqList().then((r) => setItems(r.content)).catch((e: unknown) => setError(e instanceof Error ? e.message : '조회 실패')) }
  useEffect(load, [])
  useEffect(() => {
    if (!success) return undefined
    const timer = window.setTimeout(() => setSuccess(null), 2500)
    return () => window.clearTimeout(timer)
  }, [success])
  async function restore(faqId: number) {
    setError(null); setSuccess(null); setRestoringId(faqId)
    try { await adminFaqApi.restoreFaqs({ faqIds: [faqId] }); setSuccess('FAQ가 복구되었습니다.'); load() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'FAQ를 복구하지 못했습니다.') }
    finally { setRestoringId(null) }
  }
  if (error) return <p className="page-message page-message--error">{error}</p>
  return <>{success && <p className="login-success" role="status">{success}</p>}<div className="faq-table-wrapper"><table className="faq-table"><thead><tr><th>ID</th><th>질문</th><th>버전</th><th>관리</th></tr></thead><tbody>{items.map((faq) => <tr key={faq.id}><td>{faq.id}</td><td>{faq.question}</td><td>v{faq.version}</td><td><button className="table-action-button" disabled={restoringId !== null} onClick={() => void restore(faq.id)} type="button">{restoringId === faq.id ? '복구 중...' : '복구'}</button></td></tr>)}</tbody></table></div></>
}
