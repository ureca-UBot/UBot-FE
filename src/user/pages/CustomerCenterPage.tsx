import { useAuth } from '../../auth/hooks/useAuth'
import { MyInquiryList } from '../inquiry/MyInquiryList'

interface PageProps {
  active: boolean
}

export function CustomerCenterPage({ active }: PageProps) {
  const { user, isInitializing } = useAuth()

  return (
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="customer">
      <div className="standard-hero">
        <span>고객센터</span>
        <h1>
          문의 내용을 확인하고
          <br />새 문의를 남겨보세요.
        </h1>
        <p>접수한 문의와 고객센터 답변을 이곳에서 확인할 수 있습니다.</p>
      </div>
      <div className="standard-wrap">
        {isInitializing ? (
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
