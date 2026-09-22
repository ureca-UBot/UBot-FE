import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { adminFaqApi } from '../../faq/api/faqApi'
import type { FaqLogResponse, FaqResponse, OldFaqResponse } from '../../faq/types/faq'

export function FaqDetailPage() {
  const { faqId = '' } = useParams(); const [faq, setFaq] = useState<FaqResponse | null>(null); const [logs, setLogs] = useState<FaqLogResponse[]>([]); const [history, setHistory] = useState<OldFaqResponse[]>([])
  useEffect(() => { void Promise.all([adminFaqApi.getFaq(faqId), adminFaqApi.getFaqLogsByFaq(faqId), adminFaqApi.getOldFaqsByFaq(faqId)]).then(([f, l, h]) => { setFaq(f); setLogs(l.content); setHistory(h.content) }) }, [faqId])
  if (!faq) return <p className="page-message">FAQ를 불러오는 중입니다.</p>
  return <section><h1>FAQ #{faq.id}</h1><p><strong>질문:</strong> {faq.question}</p><p><strong>답변:</strong> {faq.answer}</p><button onClick={() => void adminFaqApi.deleteFaq(String(faq.id))} type="button">삭제</button><h2>변경 이력</h2><ul>{history.map((item) => <li key={item.version}>v{item.version} · {item.question}</li>)}</ul><h2>추천 로그</h2><ul>{logs.map((item) => <li key={item.id}>질문 로그 #{item.questionLogId} · 순위 {item.rank}</li>)}</ul></section>
}
