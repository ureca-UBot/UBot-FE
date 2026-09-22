import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useAiDemo } from './ai/useAiDemo'
import { UserDialogs, type UserDialog } from './components/UserDialogs'
import { UserLoginModal } from './components/UserLoginModal'
import { useHeroCarousel } from './hooks/useHeroCarousel'
import { useScrollReveal } from './hooks/useScrollReveal'
import { useUserNavigation } from './hooks/useUserNavigation'
import { DesktopHeader } from './layout/DesktopHeader'
import { MobileBottomNav } from './layout/MobileBottomNav'
import { MobileHeader } from './layout/MobileHeader'
import { AiPage } from './pages/AiPage'
import { BenefitsPage } from './pages/BenefitsPage'
import { HomePage } from './pages/HomePage'
import { MyPage } from './pages/MyPage'
import { ProductPage } from './pages/ProductPage'
import { StorePage } from './pages/StorePage'
import { StoreLocatorPage } from './pages/StoreLocatorPage'
import { SupportPage } from './pages/SupportPage'
import { isUserPage, userPageTitles } from './routes'
import { useNavigate as useRouterNavigate } from 'react-router-dom'
import './styles/user.css'

export default function UserApp() {
  const routerNavigate = useRouterNavigate()
  const { page, navigate } = useUserNavigation()
  const { heroIndex, previous, next, goTo } = useHeroCarousel()
  const [loggedIn, setLoggedIn] = useState(false)
  const {
    messages,
    chatActive,
    context,
    sendAi,
    resetConversation,
    markNextFailure,
  } = useAiDemo({ loggedIn })
  const [scrolled, setScrolled] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [activeDialog, setActiveDialog] = useState<UserDialog>(null)
  const [toast, setToast] = useState('')
  const [productTitle, setProductTitle] = useState('Galaxy S26')
  const pendingAiPrompt = useRef('')

  useScrollReveal()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled((current) => (
        current
          ? window.scrollY > 24
          : window.scrollY > 96
      ))
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 1900)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (page !== 'ai' || !pendingAiPrompt.current) return
    const prompt = pendingAiPrompt.current
    pendingAiPrompt.current = ''
    const timer = window.setTimeout(() => void sendAi(prompt), 180)
    return () => window.clearTimeout(timer)
  }, [page, sendAi])

  const runDemo = useCallback(async (scenario: string) => {
    setActiveDialog(null)
    if (scenario === '9') {
      setActiveDialog('reserve')
      return
    }
    if (scenario === '3') markNextFailure()
    if (scenario === '5') {
      setLoggedIn(false)
      resetConversation()
    }
    navigate('ai')
    await new Promise<void>((resolve) => window.setTimeout(resolve, 150))
    if (scenario === '8') {
      await sendAi('5G 요금제 뭐 있어요?')
      await new Promise<void>((resolve) => window.setTimeout(resolve, 250))
      await sendAi('5G플랜 종류 알려줘')
      return
    }
    const prompts: Record<string, string> = {
      '1': '최신 폰 어떤게 있어?',
      '2': '위성 인터넷 서비스도 되나요?',
      '3': '인터넷 이전 설치 방법 알려줘',
      '4': '나의 혜택 알려줘',
      '5': '최신 폰 어떤게 있어?',
      '6': '내 요금제에 맞는 결합상품 추천해줘',
    }
    const prompt = prompts[scenario]
    if (prompt) await sendAi(prompt)
    if (scenario === '5') setLoginOpen(true)
  }, [markNextFailure, navigate, resetConversation, sendAi])

  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return
    const target = event.target.closest<HTMLElement>('button, a, article[data-route]')
    if (!target) return
    const route = target.dataset.route
    if (isUserPage(route)) {
      event.preventDefault()
      if (target.dataset.aiPrompt) pendingAiPrompt.current = target.dataset.aiPrompt
      navigate(route)
      return
    }
	if (target.classList.contains('open-login')) {
	  routerNavigate('/auth/login')
	  return
	}

	if (target.hasAttribute('data-login-required')) {
	  routerNavigate('/auth/login')
	  return
	}
    if (target.id === 'demoOpen' || target.id === 'mobileDemoOpen') {
      setActiveDialog('demo')
      return
    }
    if (target.id === 'demoClose') {
      setActiveDialog(null)
      return
    }
    if (target.dataset.demo) {
      void runDemo(target.dataset.demo)
      return
    }
    if (target.classList.contains('hero-prev')) return previous()
    if (target.classList.contains('hero-next')) return next()
    if (target.dataset.heroGo !== undefined) return goTo(Number(target.dataset.heroGo))
    if (target.classList.contains('product-detail')) {
      setProductTitle(target.closest<HTMLElement>('.phone-product')?.dataset.product ?? 'Galaxy S26')
      navigate('product')
      return
    }
    if (target.classList.contains('reserve-main') || target.hasAttribute('data-reserve')) {
      setActiveDialog('reserve')
      return
    }
    if (target.hasAttribute('data-bundle')) {
      setActiveDialog('bundle')
      return
    }
    if (target.id === 'reportOpen') setToast('통신 불편 제보가 접수되었습니다. (Mock)')
    if (target.id === 'reserveSubmit') setToast('방문 예약이 완료되었습니다. (Mock)')
    if (target.id === 'bundleSubmit') setToast('결합 변경이 완료되었습니다. (Mock)')
    if (target.id === 'newChat') resetConversation()
    if (target.classList.contains('send-ai')) {
      const value = target.closest('.ai-searchbox')?.querySelector<HTMLTextAreaElement>('textarea')?.value
      void sendAi(value)
    }
    if (target.dataset.aiQ) void sendAi(target.dataset.aiQ)
    if (target.dataset.retry) void sendAi(target.dataset.retry, true)
    if (target.dataset.choice) void sendAi(target.dataset.choice)
    if (target.dataset.chatRoute && isUserPage(target.dataset.chatRoute)) navigate(target.dataset.chatRoute)
    if (target.dataset.productLink) {
      setProductTitle(target.dataset.productLink)
      navigate('product')
    }
  }, [goTo, navigate, next, previous, resetConversation, routerNavigate, runDemo, sendAi])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || !(event.target instanceof HTMLTextAreaElement)) return
    event.preventDefault()
    void sendAi(event.target.value)
  }, [sendAi])

  const handleLoginSuccess = useCallback(() => {
    setLoggedIn(true)
    setLoginOpen(false)
    setToast('로그인 UI 시연이 완료되었습니다.')
  }, [])

  return (
    <div className="ubot-user-app" onClick={handleClick} onKeyDown={handleKeyDown}>
      <DesktopHeader loggedIn={loggedIn} scrolled={scrolled} page={page} />
      <MobileHeader title={userPageTitles[page]} />
      <main>
        <HomePage active={page === 'home'} heroIndex={heroIndex} loggedIn={loggedIn} />
        <StorePage active={page === 'store'} />
        <ProductPage active={page === 'product'} productTitle={productTitle} />
        <MyPage active={page === 'my'} loggedIn={loggedIn} />
        <BenefitsPage active={page === 'benefits'} />
        <SupportPage active={page === 'support'} />
        <StoreLocatorPage active={page === 'stores'} />
        <AiPage active={page === 'ai'} loggedIn={loggedIn} chatActive={chatActive} messages={messages} context={context} />
      </main>
      <MobileBottomNav page={page} />
      <UserDialogs activeDialog={activeDialog} onClose={() => setActiveDialog(null)} />
      <UserLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={handleLoginSuccess} />
      <div className={`toast${toast ? ' show' : ''}`} role="status">{toast}</div>
    </div>
  )
}
