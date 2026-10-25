import { useAuth } from '../../auth/hooks/useAuth'
import { MyInquiryList } from '../inquiry/MyInquiryList'
import { PageHero } from '../components/PageHero'
import { useSearchParams } from 'react-router-dom'
import { CustomerFaqList } from '../components/CustomerFaqList'

interface PageProps {
  active: boolean
}

export function CustomerCenterPage({ active }: PageProps) {
  const { user, isInitializing } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const faq = searchParams.get('section') === 'faq'

  return (
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="customer">
      <PageHero
        image="customer"
        eyebrow="고객센터"
        description="접수한 문의와 고객센터 답변을 이곳에서 확인할 수 있습니다."
      >
        문의 내용을 확인하고
        <br />새 문의를 남겨보세요.
      </PageHero>
      <div className="standard-wrap">
        <div className="store-tabs" aria-label="고객센터 항목">
          <button
            type="button"
            className={!faq ? 'active' : undefined}
            aria-pressed={!faq}
            onClick={() => setSearchParams({ section: 'inquiry' })}
          >
            문의
          </button>
          <button
            type="button"
            className={faq ? 'active' : undefined}
            aria-pressed={faq}
            onClick={() => setSearchParams({ section: 'faq' })}
          >
            FAQ
          </button>
        </div>
        {faq ? (
          <CustomerFaqList active={active} />
        ) : isInitializing ? (
          <p className="my-profile-message">로그인 상태를 확인하는 중입니다.</p>
        ) : user ? (
          <MyInquiryList active={active} />
        ) : (
          <div className="my-guest">
            <h2>로그인이 필요합니다.</h2>
            <p>문의 작성과 답변 확인은 로그인 후 이용할 수 있습니다.</p>
            <button className="black-btn open-login" type="button">
              로그인하기
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
