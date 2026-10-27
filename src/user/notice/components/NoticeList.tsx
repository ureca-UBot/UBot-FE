import { useState } from 'react'
import {
  formatNoticeDate,
  isNoticeExpired,
  NOTICE_REGION_LABELS,
  NOTICE_REGIONS,
  NOTICE_TYPE_LABELS,
  type NoticeRegion,
  type NoticeType,
} from '../../../shared/types/notice'
import { useNoticeBanners } from '../hooks/useNoticeBanners'
import { useNoticeList } from '../hooks/useNoticeList'
import { NoticePagination } from './NoticePagination'

const PAGE_SIZE = 10

const TYPE_TABS: { value: NoticeType | null; label: string }[] = [
  { value: null, label: '전체' },
  { value: 'NOTICE', label: NOTICE_TYPE_LABELS.NOTICE },
  { value: 'OUTAGE', label: NOTICE_TYPE_LABELS.OUTAGE },
]

interface NoticeListProps {
  // 공지 화면이 보일 때만 목록을 받습니다.
  active: boolean
  onSelect: (noticeId: number) => void
}

export function NoticeList({ active, onSelect }: NoticeListProps) {
  const [type, setType] = useState<NoticeType | null>(null)
  const [region, setRegion] = useState<NoticeRegion | null>(null)
  const [page, setPage] = useState(0)
  const { result, loading, error } = useNoticeList(active, { type, region, page, size: PAGE_SIZE })
  // 서버가 접속 IP로 판별한 지역입니다. 배너와 같은 응답을 쓰므로 따로 요청하지 않습니다.
  const { region: currentRegion, loaded: regionLoaded } = useNoticeBanners()

  return (
    <div className="notice-list">
      <div className="notice-filter">
        <div aria-label="공지 유형" className="notice-tabs" role="tablist">
          {TYPE_TABS.map((tab) => (
            <button
              aria-selected={type === tab.value}
              className={type === tab.value ? 'notice-tab notice-tab--active' : 'notice-tab'}
              key={tab.label}
              onClick={() => {
                setType(tab.value)
                setPage(0)
              }}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="notice-region">
          <span>지역</span>
          <select
            onChange={(event) => {
              setRegion((event.target.value || null) as NoticeRegion | null)
              setPage(0)
            }}
            value={region ?? ''}
          >
            <option value="">전체 지역</option>
            {NOTICE_REGIONS.map((item) => (
              <option key={item} value={item}>
                {NOTICE_REGION_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {regionLoaded && (
        <p className="notice-current-region">
          {currentRegion ? (
            <>
              현재 접속 지역 <strong>{NOTICE_REGION_LABELS[currentRegion]}</strong>
              {region !== currentRegion && (
                <button
                  onClick={() => {
                    setRegion(currentRegion)
                    setPage(0)
                  }}
                  type="button"
                >
                  이 지역 공지 보기
                </button>
              )}
            </>
          ) : (
            '접속 지역을 확인하지 못해 배너에는 전체 공지만 보여요.'
          )}
        </p>
      )}
      <p className="notice-hint">
        지역을 고르면 전체 공지와 그 지역 공지만 보여줍니다. 노출이 끝난 공지도 이력으로 남아
        있습니다.
      </p>

      {error && (
        <p className="notice-message notice-message--error" role="alert">
          {error}
        </p>
      )}

      {!result ? (
        !error && <p className="notice-message">{loading ? '공지를 불러오는 중입니다.' : ''}</p>
      ) : (
        <>
          <p className="notice-count">총 {result.totalElements}건</p>
          {result.content.length === 0 ? (
            <p className="notice-message">등록된 공지가 없습니다.</p>
          ) : (
            <ul className="notice-items">
              {result.content.map((notice) => {
                const expired = isNoticeExpired(notice.endsAt)
                return (
                  <li key={notice.noticeId}>
                    <button
                      className="notice-item"
                      onClick={() => onSelect(notice.noticeId)}
                      type="button"
                    >
                      <span
                        className={`notice-type notice-type--${notice.type === 'OUTAGE' ? 'outage' : 'notice'}`}
                      >
                        {NOTICE_TYPE_LABELS[notice.type]}
                      </span>
                      <span className="notice-item__title">{notice.title}</span>
                      <span className="notice-item__meta">
                        {notice.targetRegion && (
                          <span className="notice-item__region">
                            {NOTICE_REGION_LABELS[notice.targetRegion]}
                          </span>
                        )}
                        {expired && <span className="notice-item__expired">종료됨</span>}
                        <time dateTime={notice.createdAt}>
                          {formatNoticeDate(notice.createdAt)}
                        </time>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <NoticePagination onChange={setPage} page={page} totalPages={result.totalPages} />
        </>
      )}
    </div>
  )
}
