import { useEffect, useState, type FormEvent } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { adminInquiryApi, type AdminInquiry, type InquiryStatus } from '../../../user/inquiry/inquiryApi'

const dateTime = (value: string) => new Date(value).toLocaleString('ko-KR')
const errorText = (error: unknown) => error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'

export function InquiryListPage() {
  const [status, setStatus] = useState<InquiryStatus | ''>('')
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<PageResponse<AdminInquiry> | null>(null)
  const [selected, setSelected] = useState<AdminInquiry | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    adminInquiryApi.getAll(page, status).then((next) => {
      if (!canceled) { setResult(next); setError(null) }
    }).catch((caught: unknown) => {
      if (!canceled) setError(errorText(caught))
    })
    return () => { canceled = true }
  }, [page, status, revision])

  async function select(id: number) {
    try {
      const item = await adminInquiryApi.getOne(id)
      setSelected(item)
      setReply('')
      setError(null)
    } catch (caught) { setError(errorText(caught)) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !reply.trim()) return
    setBusy(true)
    try {
      const updated = await adminInquiryApi.reply(selected.inquiry.id, reply.trim())
      setSelected(updated)
      setRevision((current) => current + 1)
      setError(null)
    } catch (caught) {
      setError(errorText(caught))
      setRevision((current) => current + 1)
      try { setSelected(await adminInquiryApi.getOne(selected.inquiry.id)) } catch { setSelected(null) }
    } finally { setBusy(false) }
  }

  return <section className="admin-inquiries">
    <div className="page-heading"><div><h1>고객문의</h1><p>회원 문의를 확인하고 답변을 등록합니다.</p></div></div>
    <div className="inquiry-toolbar"><span>전체 {result?.totalElements ?? 0}건</span><label>처리상태 <select value={status} onChange={(event) => { setStatus(event.target.value as InquiryStatus | ''); setPage(0); setSelected(null) }}><option value="">전체</option><option value="RECEIVED">답변 대기</option><option value="RESOLVED">답변 완료</option></select></label></div>
    {error && <p className="page-message page-message--error" role="alert">{error}</p>}
    {!result && !error && <p className="page-message">문의를 불러오는 중입니다.</p>}
    {result && <><div className="faq-table-wrapper"><table className="faq-table"><thead><tr><th>ID</th><th>등록일</th><th>회원</th><th>제목</th><th>상태</th><th>상세</th></tr></thead><tbody>
      {result.content.length === 0 ? <tr><td colSpan={6}>해당하는 문의가 없습니다.</td></tr> : result.content.map((item) => <tr key={item.inquiry.id}>
        <td>{item.inquiry.id}</td><td>{dateTime(item.inquiry.createdAt)}</td><td>{item.userName} (#{item.userId})</td><td className="faq-table__question">{item.inquiry.title}</td><td>{item.inquiry.status === 'RECEIVED' ? '답변 대기' : '답변 완료'}</td><td><button className="table-action-button" onClick={() => void select(item.inquiry.id)} type="button">보기</button></td>
      </tr>)}
    </tbody></table></div>
      {result.totalPages > 1 && <div className="pagination"><button disabled={page === 0} onClick={() => setPage(page - 1)} type="button">이전</button><span>{page + 1} / {result.totalPages}</span><button disabled={result.last} onClick={() => setPage(page + 1)} type="button">다음</button></div>}
    </>}
    {selected && <div className="inquiry-detail" role="dialog" aria-modal="true" aria-labelledby="inquiryDetailTitle"><div className="inquiry-detail__panel">
      <div className="inquiry-detail__head"><h2 id="inquiryDetailTitle">문의 상세</h2><button onClick={() => setSelected(null)} type="button" aria-label="닫기">×</button></div>
      <dl><dt>회원</dt><dd>{selected.userName} (#{selected.userId})</dd><dt>등록일</dt><dd>{dateTime(selected.inquiry.createdAt)}</dd><dt>상태</dt><dd>{selected.inquiry.status === 'RECEIVED' ? '답변 대기' : '답변 완료'}</dd><dt>제목</dt><dd>{selected.inquiry.title}</dd><dt>문의 내용</dt><dd className="inquiry-detail__text">{selected.inquiry.content}</dd></dl>
      {selected.inquiry.status === 'RESOLVED' ? <div className="inquiry-reply"><b>등록된 답변</b><p>{selected.inquiry.adminReply}</p><small>{selected.inquiry.resolvedAt && dateTime(selected.inquiry.resolvedAt)}</small></div> : <form onSubmit={(event) => void submit(event)}><label htmlFor="adminInquiryReply">관리자 답변</label><textarea id="adminInquiryReply" maxLength={1000} onChange={(event) => setReply(event.target.value)} required rows={7} value={reply} /><small>{reply.length}/1000자</small><button className="primary-button" disabled={busy || !reply.trim()} type="submit">답변 등록 및 완료</button></form>}
    </div></div>}
  </section>
}
