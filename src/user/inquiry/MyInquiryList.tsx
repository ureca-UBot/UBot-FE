import { useMyInquiries } from './hooks/useMyInquiries'
import { dateTime } from './utils/format'

export function MyInquiryList({ active }: { active: boolean }) {
  const {
    openForm,
    formOpen,
    submit,
    setTitle,
    title,
    setContent,
    content,
    setFormOpen,
    busy,
    editing,
    error,
    result,
    remove,
    page,
    setPage,
  } = useMyInquiries({ active })
  return (
    <section className="my-profile my-inquiries" aria-labelledby="myInquiryTitle">
      <div className="my-profile-head">
        <h3 id="myInquiryTitle">고객센터 문의</h3>
        <button className="my-profile-ghost" onClick={() => openForm(null)} type="button">
          문의하기
        </button>
      </div>
      {formOpen && (
        <form className="inquiry-form" onSubmit={(event) => void submit(event)}>
          <label>
            제목{' '}
            <input
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label>
            내용{' '}
            <textarea
              maxLength={1000}
              onChange={(event) => setContent(event.target.value)}
              required
              rows={5}
              value={content}
            />
          </label>
          <small>
            {title.length}/200자 · {content.length}/1000자
          </small>
          <div className="inquiry-actions">
            <button className="my-profile-ghost" onClick={() => setFormOpen(false)} type="button">
              취소
            </button>
            <button disabled={busy} type="submit">
              {editing ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="my-profile-message error" role="alert">
          {error}
        </p>
      )}
      {result === null && !error && <p className="my-profile-message">문의를 불러오는 중입니다.</p>}
      {result?.content.length === 0 && (
        <p className="my-profile-message">등록한 문의가 없습니다.</p>
      )}
      {result?.content.map((item) => (
        <article className="inquiry-card" key={item.id}>
          <div className="inquiry-card__head">
            <strong>{item.title}</strong>
            <span>{item.status === 'RECEIVED' ? '답변 대기' : '답변 완료'}</span>
          </div>
          <small>{dateTime(item.createdAt)}</small>
          <p>{item.content}</p>
          {item.adminReply && (
            <div className="inquiry-reply">
              <b>고객센터 답변</b>
              <p>{item.adminReply}</p>
              <small>{item.resolvedAt && dateTime(item.resolvedAt)}</small>
            </div>
          )}
          {item.status === 'RECEIVED' && (
            <div className="inquiry-actions">
              <button
                className="my-profile-ghost"
                disabled={busy}
                onClick={() => openForm(item)}
                type="button"
              >
                수정
              </button>
              <button
                className="my-profile-ghost"
                disabled={busy}
                onClick={() => void remove(item)}
                type="button"
              >
                삭제
              </button>
            </div>
          )}
        </article>
      ))}
      {result && result.totalPages > 1 && (
        <div className="inquiry-pages">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} type="button">
            이전
          </button>
          <span>
            {page + 1} / {result.totalPages}
          </span>
          <button disabled={result.last} onClick={() => setPage(page + 1)} type="button">
            다음
          </button>
        </div>
      )}
    </section>
  )
}
