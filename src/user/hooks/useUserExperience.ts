import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useNavigate as useRouterNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { useSendQuestion } from '../ai/hooks/useSendQuestion'
import { useAiDemo } from '../ai/useAiDemo'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { useUserNavigation } from '../hooks/useUserNavigation'
import { useMyProfile } from '../my/hooks/useMyProfile'
import type { ReservationStore } from '../reservation/types/reservation'
import { isUserPage } from '../routes'

import type { UserDialog } from '../components/UserDialogs'

// 데모 상태는 실제 인증과 별도로 유지합니다. 화면/라우트 간 기존 시연 동작을 보존합니다.
export function useUserExperience() {
  const routerNavigate = useRouterNavigate()
  const { page, navigate } = useUserNavigation()
  const [loggedIn, setLoggedIn] = useState(false)
  const { user, isInitializing } = useAuth()
  const sendQuestion = useSendQuestion()
  const [isAiDemo, setIsAiDemo] = useState(false)
  // 실제 로그인한 사용자 이름. 헤더·홈에서 로그인 여부 표시와 MY 이동에 씁니다.
  const { profile } = useMyProfile()
  const memberName = profile?.name ?? null
  const { messages, chatActive, context, sendAi, resetConversation, markNextFailure } = useAiDemo({
    loggedIn,
  })
  const [scrolled, setScrolled] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [activeDialog, setActiveDialog] = useState<UserDialog>(null)
  const [reserveStore, setReserveStore] = useState<ReservationStore | null>(null)
  const [toast, setToast] = useState('')

  useScrollReveal()

  useEffect(() => {
    const handleStoreSelected = (event: Event) => {
      setReserveStore((event as CustomEvent<ReservationStore>).detail)
    }
    const handleReserveStore = (event: Event) => {
      setReserveStore((event as CustomEvent<ReservationStore>).detail)
      setActiveDialog('reserve')
    }
    document.addEventListener('ubot:store-selected', handleStoreSelected)
    document.addEventListener('ubot:reserve-store', handleReserveStore)
    return () => {
      document.removeEventListener('ubot:store-selected', handleStoreSelected)
      document.removeEventListener('ubot:reserve-store', handleReserveStore)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled((current) => (current ? window.scrollY > 24 : window.scrollY > 96))
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

  const runDemo = useCallback(
    async (scenario: string) => {
      setActiveDialog(null)
      if (scenario === '9') {
        setActiveDialog('reserve')
        return
      }
      setIsAiDemo(true)
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
    },
    [markNextFailure, navigate, resetConversation, sendAi],
  )

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!(event.target instanceof Element)) return
      const target = event.target.closest<HTMLElement>('button, a, article[data-route]')
      if (!target) return
      const route = target.dataset.route
      if (isUserPage(route)) {
        event.preventDefault()
        if (route === 'ai') {
          setIsAiDemo(false)
          if (target.dataset.aiPrompt) void sendQuestion(target.dataset.aiPrompt)
        }
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
      // 실제 채팅의 입력·재시도는 채팅 컴포넌트에서 처리합니다.
      if (target.closest('[data-live-chat]')) return
      if (target.id === 'demoClose') {
        setActiveDialog(null)
        return
      }
      if (target.dataset.demo) {
        void runDemo(target.dataset.demo)
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
      if (target.id === 'bundleSubmit') setToast('결합 변경이 완료되었습니다. (Mock)')
      if (target.id === 'newChat') resetConversation()
      if (target.classList.contains('send-ai')) {
        const value = target
          .closest('.ai-searchbox')
          ?.querySelector<HTMLTextAreaElement>('textarea')?.value
        void sendAi(value)
      }
      if (target.dataset.aiQ) void sendAi(target.dataset.aiQ)
      if (target.dataset.retry) void sendAi(target.dataset.retry, true)
      if (target.dataset.choice) void sendAi(target.dataset.choice)
      if (target.dataset.chatRoute && isUserPage(target.dataset.chatRoute))
        navigate(target.dataset.chatRoute)
      if (target.dataset.productLink) {
        navigate('store')
      }
    },
    [navigate, resetConversation, routerNavigate, runDemo, sendAi, sendQuestion],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        !isAiDemo ||
        !(event.target instanceof HTMLTextAreaElement) ||
        !event.target.closest('[data-page="ai"]') ||
        event.nativeEvent.isComposing ||
        event.nativeEvent.keyCode === 229
      )
        return
      if (event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      void sendAi(event.target.value)
    },
    [isAiDemo, sendAi],
  )

  const handleLoginSuccess = useCallback(() => {
    setLoggedIn(true)
    setLoginOpen(false)
    setToast('로그인 UI 시연이 완료되었습니다.')
  }, [])

  return {
    page,
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
    handleClick,
    handleKeyDown,
    handleLoginSuccess,
    setActiveDialog,
    setToast,
    setLoginOpen,
  }
}
