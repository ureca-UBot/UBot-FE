import { useEffect, useState } from 'react'
import { adminFaqApi } from '../../faq/api/faqApi'
import type { FaqResponse } from '../../faq/types/faq'

export function DeletedFaqListPage() {
  const [items, setItems] = useState<FaqResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isRestoreMode, setIsRestoreMode] = useState(false)
  const [selectedFaqIds, setSelectedFaqIds] = useState<Set<number>>(new Set())
  const [isRestoring, setIsRestoring] = useState(false)

  function load() {
    void adminFaqApi
      .getDeletedFaqList()
      .then((response) => setItems(response.content))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : '삭제된 FAQ를 불러오지 못했습니다.'))
  }

  useEffect(load, [])

  useEffect(() => {
    if (!success) return undefined
    const timer = window.setTimeout(() => setSuccess(null), 2500)
    return () => window.clearTimeout(timer)
  }, [success])

  function toggleFaq(faqId: number) {
    setSelectedFaqIds((current) => {
      const next = new Set(current)
      if (next.has(faqId)) next.delete(faqId)
      else next.add(faqId)
      return next
    })
  }

  function startRestoreMode() {
    setError(null)
    setSuccess(null)
    setSelectedFaqIds(new Set())
    setIsRestoreMode(true)
  }

  function cancelRestoreMode() {
    setSelectedFaqIds(new Set())
    setIsRestoreMode(false)
  }

  async function restoreSelectedFaqs() {
    if (selectedFaqIds.size === 0) return

    setError(null)
    setSuccess(null)
    setIsRestoring(true)
    try {
      await adminFaqApi.restoreFaqs({ faqIds: [...selectedFaqIds] })
      setSuccess(`${selectedFaqIds.size}개의 FAQ를 복구했습니다.`)
      cancelRestoreMode()
      load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'FAQ 복구에 실패했습니다.')
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <>
      {success && <p className="login-success" role="status">{success}</p>}
      {error && <p className="page-message page-message--error" role="alert">{error}</p>}

      <div className="faq-actions">
        {isRestoreMode ? (
          <>
            <button className="secondary-button" disabled={isRestoring} onClick={cancelRestoreMode} type="button">취소</button>
            <button className="primary-button" disabled={isRestoring || selectedFaqIds.size === 0} onClick={() => void restoreSelectedFaqs()} type="button">
              {isRestoring ? '복구 중...' : `복구 시작${selectedFaqIds.size > 0 ? ` (${selectedFaqIds.size})` : ''}`}
            </button>
          </>
        ) : (
          <button className="primary-button" onClick={startRestoreMode} type="button">복구</button>
        )}
      </div>

      <div className="faq-table-wrapper">
        <table className="faq-table">
          <thead>
            <tr>
              {isRestoreMode && <th className="faq-selection-column">선택</th>}
              <th>ID</th>
              <th>질문</th>
              <th>버전</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={isRestoreMode ? 4 : 3}>삭제된 FAQ가 없습니다.</td></tr>
            ) : items.map((faq) => (
              <tr key={faq.id}>
                {isRestoreMode && (
                  <td className="faq-selection-column">
                    <input aria-label={`FAQ ${faq.id} 선택`} checked={selectedFaqIds.has(faq.id)} disabled={isRestoring} onChange={() => toggleFaq(faq.id)} type="checkbox" />
                  </td>
                )}
                <td>{faq.id}</td>
                <td>{faq.question}</td>
                <td>v{faq.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
