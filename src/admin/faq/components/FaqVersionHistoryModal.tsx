import { useEffect, useMemo, useState } from 'react'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import { adminFaqApi } from '../api/faqApi'
import { useFaqCategories } from '../hooks/useFaqCategories'
import type { OldFaqResponse } from '../types/faq'
import type { FaqTableRow } from './FaqTable'
import { FaqReadContent } from './FaqReadContent'

interface FaqVersionHistoryModalProps {
  faq: FaqTableRow
  onClose: () => void
}

function formatDate(value: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-'
}

// undefined는 아직 기록을 고르지 않은 상태, null은 관리자 계정이 삭제된 상태입니다.
function formatAdmin(adminId: number | null | undefined) {
  if (adminId === undefined) return '-'
  return adminId ?? '삭제된 관리자'
}

export function FaqVersionHistoryModal({ faq, onClose }: FaqVersionHistoryModalProps) {
  const modalFocusRef = useModalFocus<HTMLElement>(() => {
    onClose()
  })

  const { categories } = useFaqCategories()
  const [oldFaqs, setOldFaqs] = useState<OldFaqResponse[]>([])
  const [selectedVersion, setSelectedVersion] = useState(faq.version)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    adminFaqApi
      .getOldFaqsByFaq(String(faq.id), 0, 100)
      .then((response) => {
        if (!cancelled)
          setOldFaqs(response.content.sort((left, right) => right.version - left.version))
      })
      .catch((caughtError: unknown) => {
        if (!cancelled)
          setError(
            caughtError instanceof Error ? caughtError.message : '변경 기록을 불러오지 못했습니다.',
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [faq.id])

  const selectedOldFaq = useMemo(
    () => oldFaqs.find((oldFaq) => oldFaq.version === selectedVersion) ?? null,
    [oldFaqs, selectedVersion],
  )
  const isCurrentVersion = selectedVersion === faq.version
  const categoryId = isCurrentVersion ? faq.categoryId : selectedOldFaq?.categoryId
  const categoryName =
    categories.find((category) => category.faqCategoryId === categoryId)?.name ?? '삭제된 카테고리'

  const versions = [
    { version: faq.version, label: `현재 v${faq.version}`, updatedAt: faq.updatedAt },
    ...oldFaqs.map((oldFaq) => ({
      version: oldFaq.version,
      label: `v${oldFaq.version}`,
      updatedAt: oldFaq.updatedAt,
    })),
  ]
  const snapshot = isCurrentVersion ? faq : selectedOldFaq
  const previous = oldFaqs.find((item) => item.version < selectedVersion)
  const changes =
    snapshot && previous
      ? (
          [
            ['question', '질문'],
            ['answer', '답변'],
            ['categoryId', '카테고리'],
            ['intent', '의도'],
          ] as const
        )
          .filter(([key]) => snapshot[key] !== previous[key])
          .map(([, label]) => label)
      : []

  return (
    <div className="modal-backdrop">
      <section
        ref={modalFocusRef}
        className="faq-modal faq-version-history-modal faq-reader-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-version-history-title"
      >
        <header className="faq-reader-head">
          <div>
            <span>FAQ #{faq.id} · 변경 기록</span>
            <h2 id="faq-version-history-title">FAQ 변경 기록</h2>
          </div>
        </header>
        <dl className="faq-reader-meta">
          <dt>버전</dt>
          <dd>v{selectedVersion}</dd>
          <dt>카테고리</dt>
          <dd>{categoryName}</dd>
          <dt>FAQ 생성자</dt>
          <dd>{formatAdmin(isCurrentVersion ? faq.adminId : selectedOldFaq?.createdById)}</dd>
          {!isCurrentVersion && selectedOldFaq && (
            <>
              <dt>FAQ 수정자</dt>
              <dd>{formatAdmin(selectedOldFaq.updatedById)}</dd>
            </>
          )}
          <dt>수정 날짜</dt>
          <dd>
            {formatDate(isCurrentVersion ? faq.updatedAt : (selectedOldFaq?.updatedAt ?? null))}
          </dd>
        </dl>
        <div className="faq-version-workspace">
          <nav className="faq-version-selector" aria-label="FAQ 버전 선택">
            <h3>버전별 변경 기록</h3>
            {versions.map((item) => (
              <button
                className={selectedVersion === item.version ? 'faq-version-selector__active' : ''}
                key={item.version}
                aria-pressed={selectedVersion === item.version}
                onClick={() => setSelectedVersion(item.version)}
                type="button"
              >
                <b>{item.label}</b>
                <time>{formatDate(item.updatedAt)}</time>
              </button>
            ))}
            {loading && <p role="status">기록을 불러오는 중입니다.</p>}
          </nav>
          <div className="faq-version-content">
            {error && <p className="login-error">{error}</p>}
            {!error && !loading && oldFaqs.length === 0 && (
              <p className="faq-result-count">이전 변경 기록이 없습니다.</p>
            )}

            {previous && (
              <p className="faq-version-changes">
                v{previous.version} 대비 변경 항목:{' '}
                {changes.length ? changes.join(' · ') : '본문 변경 없음'}
              </p>
            )}
            {snapshot && <FaqReadContent question={snapshot.question} answer={snapshot.answer} />}
          </div>
        </div>

        <div className="faq-modal__actions">
          <button className="secondary-button" onClick={onClose} type="button">
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}
