import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/hooks/useAuth'
import { profileApi } from '../api/profileApi'
import type { UserProfile } from '../types/profile'
import { MyProfileContext, type MyProfileContextValue } from './MyProfileContext'

// 헤더·홈의 로그인 표시와 MY 회원 정보 카드가 같은 회원 정보를 보도록 공유합니다.
export function MyProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [loadedProfile, setLoadedProfile] = useState<UserProfile | null>(null)

  const refreshProfile = useCallback(async () => {
    setLoadedProfile(await profileApi.getMe())
  }, [])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    profileApi.getMe()
      .then((result) => {
        if (!cancelled) setLoadedProfile(result)
      })
      // 표시용 조회라 실패는 무시합니다. 오류 안내는 MY 화면의 회원 정보 카드가 담당합니다.
      .catch(() => {})
    return () => { cancelled = true }
  }, [user])

  // 로그아웃했거나 다른 계정으로 바뀐 직후에는 이전 사용자의 정보를 보여주지 않습니다.
  const profile = user && loadedProfile && String(loadedProfile.id) === user.id ? loadedProfile : null

  const value = useMemo<MyProfileContextValue>(
    () => ({ profile, refreshProfile, updateProfile: setLoadedProfile }),
    [profile, refreshProfile],
  )

  return <MyProfileContext value={value}>{children}</MyProfileContext>
}
