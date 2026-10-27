import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { LogoutButton } from '../../auth/components/LogoutButton'
import { ApiRequestError } from '../../shared/api/client'
import { counselApi } from '../api/counselApi'
import type { Session } from '../types/counsel'
import { CounselConversation } from '../components/CounselConversation'
import { CounselCustomerPanel } from '../components/CounselCustomerPanel'
import { counselConfig } from '../config/counselConfig'
import { counselStates } from '../hooks/useCustomerCounsel'
import { PageHero } from '../../user/components/PageHero'
import logo from '../../user/assets/ubot-logo.png'
import homeIcon from '../../user/assets/header-home.svg'
import logoutIcon from '../../user/assets/header-logout.svg'
import '../../user/styles/user.css'
import '../styles/counsel.css'
import '../styles/workspace.css'

// 서버가 이 상담사에게 더 이상 보여 주지 않는 상담(재배정·삭제)을 나타내는 오류 코드
const UNASSIGNED_CODES = new Set(['COUNSEL-003', 'COUNSEL-004'])

export function CounselPage() {
  const { user, isInitializing } = useAuth()
  if (!counselConfig.enabled)
    return (
      <main className="counsel-page counsel-entry ubot-user-app">
        <h1>상담자</h1>
        <p>상담자 기능은 준비 중입니다.</p>
        <Link to="/">홈으로</Link>
      </main>
    )
  if (isInitializing)
    return (
      <main className="counsel-page counsel-entry ubot-user-app">
        로그인 상태를 확인하고 있어요.
      </main>
    )
  if (!user)
    return (
      <main className="counsel-page counsel-entry ubot-user-app">
        <h1>사람 상담</h1>
        <p>로그인 후 상담을 요청할 수 있습니다.</p>
        <Link to="/auth/login">로그인하기</Link>
      </main>
    )
  if (user.role !== 'COUNSELOR') return <Navigate to="/" replace />
  return <CounselWorkspace key={user.id} />
}

function CounselWorkspace() {
  const [session, setSession] = useState<Session | null>(null)
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const alive = useRef(true)
  const revision = useRef(0)
  const latest = useRef<Session | null>(null)

  const show = useCallback((value: Session | null) => {
    latest.current = value
    setSession(value)
  }, [])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    // 상담이 끝나도 다음 배정을 위해 접속 확인과 배정 조회를 계속함
    let stopped = false
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let lastHeartbeat = 0
    async function poll() {
      const startedAt = revision.current
      try {
        if (Date.now() - lastHeartbeat > counselConfig.heartbeatIntervalMs) {
          const presence = await counselApi.heartbeat(controller.signal)
          if (stopped) return
          setAvailable(presence.status === 'AVAILABLE')
          lastHeartbeat = Date.now()
        }
        const current = await counselApi.current(controller.signal)
        if (stopped || revision.current !== startedAt) return
        const previous = latest.current
        let next = current ?? (previous?.status === 'ENDED' ? previous : null)
        let unassigned = false
        // 담당 상담이 목록에서 빠지면 종료로 추정하지 않고 서버에 마지막 상태를 확인함
        if (!current && previous && previous.status !== 'ENDED') {
          try {
            next = await counselApi.session(previous.sessionId, controller.signal)
          } catch (e) {
            if (!(e instanceof ApiRequestError && e.code && UNASSIGNED_CODES.has(e.code))) throw e
            unassigned = true
          }
          if (stopped || revision.current !== startedAt) return
        }
        show(next)
        if (current) setNotice('')
        else if (unassigned)
          setNotice(
            '이 상담은 더 이상 배정되어 있지 않아요. 연결이 끊긴 동안 다른 상담사에게 넘어갔을 수 있어요.',
          )
        setError('')
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : '상담 상태를 불러오지 못했습니다.')
      } finally {
        if (!stopped) {
          setLoading(false)
          timer = setTimeout(poll, counselConfig.pollIntervalMs)
        }
      }
    }
    void poll()
    return () => {
      stopped = true
      controller.abort()
      clearTimeout(timer)
    }
  }, [show])

  async function action(operation: () => Promise<void>) {
    revision.current += 1
    setBusy(true)
    setError('')
    try {
      await operation()
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : '요청에 실패했습니다.')
    } finally {
      revision.current += 1
      if (alive.current) setBusy(false)
    }
  }
  return (
    <main className="counsel-page ubot-user-app">
      <header className="counsel-header">
        <Link className="counsel-brand" to="/" aria-label="UBot 홈">
          <img src={logo} alt="UBot" />
          <span>상담사</span>
        </Link>
        <nav className="counsel-header-actions" aria-label="상담사 메뉴">
          <Link className="counsel-header-action" to="/" aria-label="홈으로">
            <img src={homeIcon} alt="" />
            <span>홈으로</span>
          </Link>
          <LogoutButton className="counsel-header-action">
            <img src={logoutIcon} alt="" />
            <span>로그아웃</span>
          </LogoutButton>
        </nav>
      </header>
      <PageHero
        image="customer"
        eyebrow="UBot · 사람 상담"
        description="고객의 질문에 답하고, 진행 중인 상담을 확인하세요."
      >
        상담사 업무 공간
      </PageHero>
      <div className="counsel-workspace">
        {error && (
          <p className="counsel-error" role="alert">
            {error}
          </p>
        )}
        <div className="counsel-toolbar">
          <div className="counsel-assignment-heading">
            <h2>상담 배정</h2>
            <span className={`counsel-presence${available ? ' is-available' : ''}`} role="status">
              {available ? '상담 가능' : '오프라인'}
            </span>
          </div>
          <button
            className="counsel-primary"
            disabled={busy || loading}
            onClick={() =>
              void action(async () => {
                const result = await counselApi.availability(available ? 'OFFLINE' : 'AVAILABLE')
                if (alive.current) setAvailable(result.status === 'AVAILABLE')
              })
            }
          >
            {available ? '오프라인으로 전환' : '상담 가능으로 전환'}
          </button>
        </div>
        {loading ? (
          <p role="status">상담 내역을 확인하고 있어요.</p>
        ) : session ? (
          <>
            <div className="counsel-toolbar">
              <strong role="status">{counselStates[session.status]}</strong>
              {session.status !== 'ENDED' && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      const ended = await counselApi.end(session.sessionId)
                      if (alive.current) show(ended)
                    })
                  }
                >
                  {session.status === 'WAITING' ? '대기 취소' : '상담 종료'}
                </button>
              )}
            </div>
            {session.status === 'WAITING' && (
              <p>접수 순서대로 연결합니다. 이 화면을 닫아도 대기 요청은 유지됩니다.</p>
            )}
            {session.status === 'PAUSED' && (
              <p>
                재접속을 기다리고 있습니다. 정해진 시간 안에 연결되지 않으면 다른 상담사에게 다시
                연결합니다.
              </p>
            )}
            <div
              className={`counsel-session-workspace${session.status === 'ENDED' ? ' is-ended' : ''}`}
            >
              {/* 종료된 상담은 서버가 고객 정보 조회를 막으므로 패널을 내립니다. */}
              {session.status !== 'ENDED' && (
                <CounselCustomerPanel
                  key={`customer:${session.sessionId}:${session.assignmentVersion}`}
                  sessionId={session.sessionId}
                />
              )}
              <CounselConversation
                key={`${session.sessionId}:${session.assignmentVersion}`}
                session={session}
                role="COUNSELOR"
              />
            </div>
          </>
        ) : (
          <div className="counsel-empty">
            <svg className="counsel-empty-icon" viewBox="0 0 64 64" aria-hidden="true">
              <path d="M38 42c-4 3-9 4-14 3L10 50l4-12a18 18 0 1 1 24 4Z M41 27a15 15 0 0 1 9 25l3 8-11-4a15 15 0 0 1-14-4" />
              <path d="M22 27h.1M30 27h.1M38 27h.1" />
            </svg>
            <h2>배정된 상담이 없습니다</h2>
            {notice && <p role="status">{notice}</p>}
            <p>
              {available
                ? '새 상담이 배정되면 이곳에 표시됩니다.'
                : '상담 가능 상태로 전환하면 기다리는 고객과 연결됩니다.'}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
