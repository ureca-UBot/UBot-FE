import { NoticeDetail } from '../notice/components/NoticeDetail'
import { NoticeList } from '../notice/components/NoticeList'
import { useNoticeSelection } from '../notice/hooks/useNoticeSelection'

interface PageProps {
    active: boolean;
}

export function NoticePage({ active }: PageProps) {
    const { selectedId, select } = useNoticeSelection()

    return (
        <section className={`route page-standard${active ? ' active' : ''}`} data-page="notices">
            <div className="standard-hero notice-hero"><span>공지 · 장애</span><h1>서비스 소식과 장애 안내를<br />한곳에서 확인하세요.</h1><p>점검, 장애, 이용 안내를 최신순으로 보여줍니다. 지역 공지는 지역을 골라 모아 볼 수 있어요.</p></div>
            <div className="standard-wrap notice-page">
                {selectedId === null
                    ? <NoticeList active={active} onSelect={select} />
                    : <NoticeDetail active={active} key={selectedId} noticeId={selectedId} onBack={() => select(null)} />}
            </div>
        </section>
    )
}