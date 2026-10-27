import { createContext } from 'react'
import type { UserProfile } from '../types/profile'

export interface MyProfileContextValue {
  /** 로그인한 사용자의 회원 정보. 비로그인이거나 아직 불러오지 못했으면 null입니다. */
  profile: UserProfile | null
  refreshProfile: () => Promise<void>
  updateProfile: (profile: UserProfile) => void
}

export const MyProfileContext = createContext<MyProfileContextValue | null>(null)
