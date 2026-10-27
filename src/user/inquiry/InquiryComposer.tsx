import { useEffect, useRef, type FormEvent } from 'react'

interface InquiryComposerProps {
  editing: boolean
  title: string
  content: string
  busy: boolean
  error: string | null
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

// 목록과 독립된 하단 작성 영역입니다. 저장 요청은 부모의 문의 훅에서 처리합니다.
export function InquiryComposer({
  editing,
  title,
  content,
  busy,
  error,
  onTitleChange,
  onContentChange,
  onSubmit,
  onCancel,
}: InquiryComposerProps) {
  const titleInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    titleInputRef.current?.closest('section')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
    titleInputRef.current?.focus({ preventScroll: true })
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  return (
    <section className="my-profile inquiry-compose" aria-labelledby="inquiryFormTitle">
      <div className="my-profile-head">
        <h3 id="inquiryFormTitle">{editing ? '문의 수정' : '새 문의 작성'}</h3>
        <button className="my-profile-ghost" type="button" disabled={busy} onClick={onCancel}>
          취소
        </button>
      </div>
      <form className="inquiry-form" onSubmit={onSubmit}>
        <label>
          제목{' '}
          <input
            ref={titleInputRef}
            maxLength={200}
            onChange={(event) => onTitleChange(event.target.value)}
            required
            value={title}
          />
        </label>
        <label>
          내용{' '}
          <textarea
            maxLength={1000}
            onChange={(event) => onContentChange(event.target.value)}
            required
            rows={10}
            value={content}
          />
        </label>
        <small>
          {title.length}/200자 · {content.length}/1000자
        </small>
        {error && (
          <p className="my-profile-message error" role="alert">
            {error}
          </p>
        )}
        <div className="inquiry-actions">
          <button disabled={busy} type="submit">
            {busy ? '저장 중...' : editing ? '수정하기' : '등록하기'}
          </button>
        </div>
      </form>
    </section>
  )
}
