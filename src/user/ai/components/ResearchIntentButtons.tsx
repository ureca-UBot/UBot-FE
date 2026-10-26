import { useId, useState, type ReactNode } from 'react'
import {
  CHAT_INTENT_LABELS,
  type ChatIntent,
  type ChatLocation,
  type ChatResearch,
} from '../types/chat'
import { getCurrentLocation } from '../utils/getCurrentLocation'

interface ResearchIntentButtonsProps {
  // 이 질문에서 이미 요청한 의도별 재검색 결과입니다.
  researches: ChatResearch[]
  // 다른 요청이 진행 중이면 모든 버튼을 잠급니다.
  disabled: boolean
  onResearch: (intent: ChatIntent, location?: ChatLocation) => Promise<boolean>
  feedback?: ReactNode
}

const INTENTS: ChatIntent[] = ['GENERAL', 'STORE_DATA', 'USER_DATA', 'PRODUCT_DATA']

// 요청 중이거나 서버가 처리한 결과가 있으면 그 의도는 사용한 것입니다.
// 서버에 닿지 못한 실패(응답과 오류 코드가 모두 없음)만 다시 누를 수 있으며,
// ChatProvider의 canResearchAgain 규칙과 같아야 합니다.
function isUsed(research: ChatResearch | undefined) {
  if (!research) return false
  return research.isPending || research.response !== null || research.errorCode !== null
}

export function ResearchIntentButtons({
  researches,
  disabled,
  onResearch,
  feedback,
}: ResearchIntentButtonsProps) {
  const [isLocating, setIsLocating] = useState(false)
  const [locationNote, setLocationNote] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const choicesId = useId()

  const handleClick = async (intent: ChatIntent) => {
    if (disabled || isLocating) return
    setLocationNote(null)

    let location: ChatLocation | undefined
    // 위치는 매장 의도를 눌렀을 때만 요청합니다.
    if (intent === 'STORE_DATA') {
      setIsLocating(true)
      try {
        const found = await getCurrentLocation()
        if (found) location = found
        else {
          setLocationNote('위치 권한을 허용하거나 지역명을 포함해 다시 질문해 주세요.')
          return
        }
      } finally {
        setIsLocating(false)
      }
    }

    await onResearch(intent, location)
  }

  return (
    <div className="research-actions">
      <div className="research-toolbar">
        <button
          className="research-toggle research-prompt"
          type="button"
          title={expanded ? '질문 의도 접기' : '질문 의도 펼치기'}
          aria-expanded={expanded}
          aria-controls={choicesId}
          onClick={() => setExpanded((value) => !value)}
        >
          질문에 맞는 의도를 선택하면 다시 찾아드려요.
        </button>
        {feedback}
      </div>
      <div id={choicesId} hidden={!expanded}>
        <div className="answer-actions" role="group" aria-label="질문 의도 선택">
          {INTENTS.map((intent) => (
            <button
              key={intent}
              type="button"
              aria-pressed={isUsed(researches.find((item) => item.intent === intent))}
              disabled={
                disabled || isLocating || isUsed(researches.find((item) => item.intent === intent))
              }
              onClick={() => void handleClick(intent)}
            >
              {isLocating && intent === 'STORE_DATA'
                ? '위치 확인 중...'
                : CHAT_INTENT_LABELS[intent]}
            </button>
          ))}
        </div>
        {locationNote && (
          <p className="research-note" role="status">
            {locationNote}
          </p>
        )}
      </div>
    </div>
  )
}
