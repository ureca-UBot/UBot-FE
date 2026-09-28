import { useContext } from 'react'
import { MyProfileContext } from '../context/MyProfileContext'

export function useMyProfile() {
  const value = useContext(MyProfileContext)
  if (!value) throw new Error('useMyProfile은 MyProfileProvider 안에서 사용해야 합니다.')
  return value
}
