import { useEffect, useState, type FormEvent } from 'react'
import type { PageResponse } from '../../shared/types/api'
import { inquiryApi, type Inquiry } from './inquiryApi'

const dateTime = (value: string) => new Date(value).toLocaleString('ko-KR')
const errorText = (error: unknown) => error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'

export function MyInquiryList({ active }: { active: boolean }) {
  const [result, setResult] = useState<PageResponse<Inquiry> | null>(null)
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<Inquiry | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let canceled = false
    inquiryApi.getMine(page).then((next) => {
      if (!canceled) { setResult(next); setError(null) }
    }).catch((caught: unknown) => {
      if (!canceled) setError(errorText(caught))
    })
    return () => { canceled = true }
  }, [active, page, revision])

  function openForm(item: Inquiry | null) {
    setEditing(item)
    setTitle(item?.title ?? '')
    setContent(item?.content ?? '')
    setError(null)
    setFormOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !content.trim()) { setError('제목과 내용을 입력해 주세요.'); return }
    setBusy(true)
    try {
      if (editing) await inquiryApi.update(editing.id, title.trim(), content.trim())
      else await inquiryApi.create(title.trim(), content.trim())
      setFormOpen(false)
      setEditing(null)
      setPage(0)
      setRevision((current) => current + 1)
      setError(null)
    } catch (caught) {
      setError(errorText(caught))
      setRevision((current) => current + 1)
    } finally { setBusy(false) }
  }

  async function remove(item: Inquiry) {
    if (!window.confirm('답변 전 문의를 삭제할까요? 삭제한 문의는 복구할 수 없습니다.')) return
    setBusy(true)
    try {
      await inquiryApi.delete(item.id)
      setRevision((current) => current + 1)
      setError(null)
    } catch (caught) {
      setError(errorText(caught))
      setRevision((current) => current + 1)
    } finally { setBusy(false) }
  }

  return (
    <section className="my-profile my-inquiries" aria-labelledby="myInquiryTitle">
      <div className="my-profile-head">
        <h3 id="myInquiryTitle">고객센터 문의</h3>
        <button className="my-profile-ghost" onClick={() => openForm(null)} type="button">문의하기</button>
      </div>
      {formOpen && <form className="inquiry-form" onSubmit={(event) => void submit(event)}>
        <label>제목 <input maxLength={200} onChange={(event) => setTitle(event.target.value)} required value={title} /></label>
        <label>내용 <textarea maxLength={1000} onChange={(event) => setContent(event.target.value)} required rows={5} value={content} /></label>
        <small>{title.length}/200자 · {content.length}/1000자</small>
        <div className="inquiry-actions"><button className="my-profile-ghost" onClick={() => setFormOpen(false)} type="button">취소</button><button disabled={busy} type="submit">{editing ? '수정하기' : '등록하기'}</button></div>
      </form>}
      {error && <p className="my-profile-message error" role="alert">{error}</p>}
      {result === null && !error && <p className="my-profile-message">문의를 불러오는 중입니다.</p>}
      {result?.content.length === 0 && <p className="my-profile-message">등록한 문의가 없습니다.</p>}
      {result?.content.map((item) => <article className="inquiry-card" key={item.id}>
        <div className="inquiry-card__head"><strong>{item.title}</strong><span>{item.status === 'RECEIVED' ? '답변 대기' : '답변 완료'}</span></div>
        <small>{dateTime(item.createdAt)}</small>
        <p>{item.content}</p>
        {item.adminReply && <div className="inquiry-reply"><b>고객센터 답변</b><p>{item.adminReply}</p><small>{item.resolvedAt && dateTime(item.resolvedAt)}</small></div>}
        {item.status === 'RECEIVED' && <div className="inquiry-actions"><button className="my-profile-ghost" disabled={busy} onClick={() => openForm(item)} type="button">수정</button><button className="my-profile-ghost" disabled={busy} onClick={() => void remove(item)} type="button">삭제</button></div>}
      </article>)}
      {result && result.totalPages > 1 && <div className="inquiry-pages"><button disabled={page === 0} onClick={() => setPage(page - 1)} type="button">이전</button><span>{page + 1} / {result.totalPages}</span><button disabled={result.last} onClick={() => setPage(page + 1)} type="button">다음</button></div>}
    </section>
  )
}
