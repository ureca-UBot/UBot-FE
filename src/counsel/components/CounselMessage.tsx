import { getAnswerText } from '../../user/ai/utils/answerText'
import { CounselorIcon } from './CounselorIcon'
import type { ReactNode } from 'react'

interface CounselMessageProps {
  className: string
  role: 'USER' | 'AI' | 'COUNSELOR'
  mine: boolean
  content: string
  detail?: string
  children?: ReactNode
}

const labels = { USER: '고객', AI: 'AI', COUNSELOR: '상담사' }

export function CounselMessage({
  className,
  role,
  mine,
  content,
  detail,
  children,
}: CounselMessageProps) {
  return (
    <article
      className={`${className} msg ${mine ? 'user mine' : role === 'AI' ? 'ai' : 'counselor'}`}
    >
      {!mine && (
        <div className="msg-avatar" aria-hidden="true">
          {role === 'AI' ? 'AI' : role === 'COUNSELOR' ? <CounselorIcon size={18} /> : '고객'}
        </div>
      )}
      <div className="msg-body">
        <small>
          {labels[role]}
          {detail && ` · ${detail}`}
        </small>
        <p>{role === 'AI' ? getAnswerText(content) : content}</p>
        {children}
      </div>
    </article>
  )
}
