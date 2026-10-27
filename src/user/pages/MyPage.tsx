import { LogoutButton } from '../../auth/components/LogoutButton'
import { useAuth } from '../../auth/hooks/useAuth'
import { MyProfileCard } from '../my/components/MyProfileCard'
import { MyNotificationList } from '../notification/components/MyNotificationList'
import { MyReservationList } from '../reservation/components/MyReservationList'
import { MySubscriptionInfo } from '../subscription/components/MySubscriptionInfo'
import { PageHero } from '../components/PageHero'

interface PageProps {
  active: boolean
  loggedIn: boolean
}

export function MyPage({ active, loggedIn: demoLoggedIn }: PageProps) {
  // 실제 로그인(AuthProvider)과 시연용 로그인(UserApp) 중 하나라도 있으면 회원 화면을 보여줍니다.
  const { user } = useAuth()
  const loggedIn = demoLoggedIn || user !== null

  return (
    <>
      <section className={`route page-standard${active ? ' active' : ''}`} data-page="my">
        <PageHero
          image="my"
          eyebrow="내 정보"
          description="요금, 사용량, 결합 정보와 개인 혜택을 확인합니다."
        >
          {loggedIn ? (
            <>
              내 통신 생활,
              <br />
              필요한 정보만 한눈에.
            </>
          ) : (
            <>
              로그인하면 내 통신 생활을
              <br />
              한눈에 확인할 수 있어요.
            </>
          )}
        </PageHero>
        <div className="standard-wrap">
          <div className={`my-guest${loggedIn ? ' hidden' : ''}`} id="myGuest">
            <h2>현재 비회원입니다.</h2>
            <p>내 정보 조회를 위해 로그인이 필요해요.</p>
            <button className="black-btn open-login">로그인하기</button>
          </div>
          <div className={`my-member${loggedIn ? '' : ' hidden'}`} id="myMember">
            {/* 실제 로그인이면 내 회선 정보를 조회해 보여주고, 시연용 로그인이면 예시 화면을 그대로 둡니다. */}
            {user ? (
              <MySubscriptionInfo active={active} key={`subscription-${user.id}`} />
            ) : (
              <article className="member-summary">
                <div>
                  <small>010-55••-21••</small>
                  <h2>5G 스탠다드</h2>
                  <span>9월 청구요금</span>
                  <b>54,700원</b>
                </div>
                <div className="usage-circle">
                  <i>100%</i>
                </div>
              </article>
            )}
            {user && <MyProfileCard active={active} key={user.id} />}
            {user && <MyReservationList active={active} key={`reservation-${user.id}`} />}
            {user && <MyNotificationList active={active} key={`notification-${user.id}`} />}
            {user && <LogoutButton className="outline-wide my-logout" redirectTo={null} />}
          </div>
        </div>
      </section>

      {/*BENEFITS*/}
    </>
  )
}
