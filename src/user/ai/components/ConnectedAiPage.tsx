import type { ComponentProps } from 'react'
import { AiPage } from '../../pages/AiPage'
import { useChat } from '../hooks/useChat'

type Props = Omit<ComponentProps<typeof AiPage>, 'chat'> & { isDemo: boolean }

// 채팅 진행 상태가 바뀔 때 사용자 앱 전체 대신 채팅 화면만 구독해 갱신합니다.
export function ConnectedAiPage({ isDemo, ...props }: Props) {
  const chat = useChat()
  return <AiPage {...props} chat={isDemo ? undefined : chat} />
}
