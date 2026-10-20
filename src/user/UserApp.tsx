import { ConnectedAiPage } from './ai/components/ConnectedAiPage'
import { UserDialogs } from './components/UserDialogs'
import { UserLoginModal } from './components/UserLoginModal'
import { VisitedPage } from './components/VisitedPage'
import { useUserExperience } from './hooks/useUserExperience'
import { DesktopHeader } from './layout/DesktopHeader'
import { MobileBottomNav } from './layout/MobileBottomNav'
import { MobileHeader } from './layout/MobileHeader'
import { NoticeBanners } from './notice/components/NoticeBanners'
import { BenefitsPage } from './pages/BenefitsPage'
import { HomePage } from './pages/HomePage'
import { MyPage } from './pages/MyPage'
import { NoticePage } from './pages/NoticePage'
import { ProductPage } from './pages/ProductPage'
import { StoreLocatorPage } from './pages/StoreLocatorPage'
import { StorePage } from './pages/StorePage'
import { SupportPage } from './pages/SupportPage'
import { userPageTitles } from './routes'
import './styles/user.css'

export default function UserApp() {
  const {
    page,
    heroIndex,
    loggedIn,
    user,
    isInitializing,
    isAiDemo,
    memberName,
    profile,
    messages,
    chatActive,
    context,
    scrolled,
    loginOpen,
    activeDialog,
    reserveStore,
    toast,
    productTitle,
    handleClick,
    handleKeyDown,
    handleLoginSuccess,
    setActiveDialog,
    setToast,
    setLoginOpen,
  } = useUserExperience()

  return (
    <div className="ubot-user-app" onClick={handleClick} onKeyDown={handleKeyDown}>
      <NoticeBanners onNoticePage={page === 'notices'} />
      <DesktopHeader loggedIn={loggedIn} memberName={memberName} scrolled={scrolled} page={page} />
      <MobileHeader title={userPageTitles[page]} />
      <main>
        <VisitedPage active={page === 'home'}>
          <HomePage
            active={page === 'home'}
            heroIndex={heroIndex}
            loggedIn={loggedIn}
            memberName={memberName}
          />
        </VisitedPage>
        <VisitedPage active={page === 'store'}>
          <StorePage active={page === 'store'} />
        </VisitedPage>
        <VisitedPage active={page === 'product'}>
          <ProductPage active={page === 'product'} productTitle={productTitle} />
        </VisitedPage>
        <VisitedPage active={page === 'my'}>
          <MyPage active={page === 'my'} loggedIn={loggedIn} />
        </VisitedPage>
        <VisitedPage active={page === 'benefits'}>
          <BenefitsPage active={page === 'benefits'} />
        </VisitedPage>
        <VisitedPage active={page === 'support'}>
          <SupportPage active={page === 'support'} />
        </VisitedPage>
        <VisitedPage active={page === 'stores'}>
          <StoreLocatorPage active={page === 'stores'} />
        </VisitedPage>
        <VisitedPage active={page === 'notices'}>
          <NoticePage active={page === 'notices'} />
        </VisitedPage>
        <VisitedPage active={page === 'ai'}>
          <ConnectedAiPage
            key={`${isAiDemo ? 'demo' : 'live'}:${user?.id ?? 'guest'}`}
            active={page === 'ai'}
            loggedIn={isAiDemo ? loggedIn : Boolean(user)}
            chatActive={chatActive}
            messages={messages}
            context={context}
            isDemo={isAiDemo}
            isInitializing={isInitializing}
            memberName={memberName}
            residenceArea={profile?.residenceArea}
          />
        </VisitedPage>
      </main>
      <MobileBottomNav page={page} />
      <UserDialogs
        activeDialog={activeDialog}
        reserveStore={reserveStore}
        onClose={() => setActiveDialog(null)}
        onReserved={(message) => {
          setActiveDialog(null)
          setToast(message)
        }}
      />
      <UserLoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
      <div className={`toast${toast ? ' show' : ''}`} role="status">
        {toast}
      </div>
    </div>
  )
}
