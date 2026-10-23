import { useRef, useState, type FormEvent } from 'react'
import { safetySentenceApi } from '../api/safetySentenceApi'
import { SafetySentenceEditor } from '../components/SafetySentenceEditor'
import { SafetySentenceTable } from '../components/SafetySentenceTable'
import { counselConfig } from '../config/counselConfig'
import { useSafetySentences } from '../hooks/useSafetySentences'
import type { SafetySentence } from '../types/safetySentence'
import '../styles/safetySentences.css'

export function SafetySentencesPage() {
  if (!counselConfig.enabled)
    return (
      <section className="page-heading">
        <div>
          <h1>상담 금지 문장 관리</h1>
          <p>상담자 기능은 준비 중입니다.</p>
        </div>
      </section>
    )
  return <SafetySentences />
}

function SafetySentences() {
  const list = useSafetySentences()
  const [keyword, setKeyword] = useState('')
  const [editor, setEditor] = useState<{ sentence: SafetySentence | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  async function mutate(operation: () => Promise<unknown>) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      await operation()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '금지 문장을 변경하지 못했습니다.')
    } finally {
      inFlight.current = false
      setBusy(false)
      list.refresh()
    }
  }
  function search(event: FormEvent) {
    event.preventDefault()
    setError('')
    list.search(keyword.trim())
  }
  function remove(item: SafetySentence) {
    if (window.confirm('이 금지 문장을 삭제할까요? 삭제하면 차단에 사용되지 않습니다.')) {
      void mutate(() => safetySentenceApi.remove(item.sentenceId, item.revision))
    }
  }
  return (
    <section className="counsel-sentence-page">
      <div className="page-heading">
        <div>
          <h1>상담 금지 문장 관리</h1>
          <p>
            기존 금지어 필터를 통과한 상담 메시지를 검사할 문장을 관리합니다. 활성 문장은 저장 후
            자동 색인됩니다.
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={busy}
          onClick={() => setEditor({ sentence: null })}
        >
          문장 등록
        </button>
      </div>
      <form className="faq-search" onSubmit={search}>
        <input
          aria-label="금지 문장 검색"
          maxLength={100}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="문장 검색"
        />
        <button className="primary-button" disabled={busy || list.loading}>
          검색
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={busy || list.loading}
          onClick={list.refresh}
        >
          새로고침
        </button>
      </form>
      {(error || list.error) && (
        <p role="alert" className="page-message page-message--error">
          {error || list.error}
        </p>
      )}
      {list.loading && (
        <p role="status" className="page-message">
          금지 문장을 불러오는 중입니다.
        </p>
      )}
      {list.result && (
        <>
          <SafetySentenceTable
            items={list.result.items}
            busy={busy || list.loading}
            onEdit={(item) => setEditor({ sentence: item })}
            onDelete={remove}
            onToggle={(item) =>
              void mutate(() =>
                safetySentenceApi.update(item.sentenceId, {
                  content: item.content,
                  severity: item.severity,
                  enabled: !item.enabled,
                  revision: item.revision,
                }),
              )
            }
            onRetry={(item) =>
              void mutate(() => safetySentenceApi.retryIndex(item.sentenceId, item.revision))
            }
          />
          <nav className="pagination" aria-label="금지 문장 페이지">
            <button
              type="button"
              disabled={busy || list.loading || list.page === 0}
              onClick={() => list.changePage(list.page - 1)}
            >
              이전
            </button>
            <span aria-live="polite">{list.page + 1}페이지</span>
            <button
              type="button"
              disabled={busy || list.loading || !list.result.hasNext}
              onClick={() => list.changePage(list.page + 1)}
            >
              다음
            </button>
          </nav>
        </>
      )}
      {editor && (
        <SafetySentenceEditor
          sentence={editor.sentence}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            setError('')
            if (editor.sentence) list.refresh()
            else {
              setKeyword('')
              list.search('')
            }
          }}
        />
      )}
    </section>
  )
}
