import { NoticeDetail } from '../notice/components/NoticeDetail'
import { NoticeList } from '../notice/components/NoticeList'
import { useNoticeSelection } from '../notice/hooks/useNoticeSelection'
import { PageHero } from '../components/PageHero'

interface PageProps {
  active: boolean
}

export function NoticePage({ active }: PageProps) {
  const { selectedId, select } = useNoticeSelection()

  return (
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="notices">
      <PageHero
        image="notices"
        eyebrow="공지 · 장애"
        description="점검, 장애, 이용 안내를 최신순으로 보여줍니다. 지역 공지는 지역을 골라 모아 볼 수 있어요."
      >
        서비스 소식과 장애 안내를
        <br />
        한곳에서 확인하세요.
      </PageHero>
      <div className="standard-wrap notice-page">
        {selectedId === null ? (
          <NoticeList active={active} onSelect={select} />
        ) : (
          <NoticeDetail
            active={active}
            key={selectedId}
            noticeId={selectedId}
            onBack={() => select(null)}
          />
        )}
      </div>
    </section>
  )
}
