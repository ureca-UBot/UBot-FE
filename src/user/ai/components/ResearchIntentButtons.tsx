import { useState } from 'react'
import { CHAT_INTENT_LABELS, type ChatIntent, type ChatLocation, type ChatResearch } from '../types/chat'
import { getCurrentLocation } from '../utils/getCurrentLocation'

interface ResearchIntentButtonsProps {
    // 이 질문에서 이미 요청한 의도별 재검색 결과입니다.
    researches: ChatResearch[]
    // 다른 요청이 진행 중이면 모든 버튼을 잠급니다.
    disabled: boolean
    onResearch: (intent: ChatIntent, location?: ChatLocation) => Promise<boolean>
}

const INTENTS: ChatIntent[] = ['GENERAL', 'STORE_DATA', 'USER_DATA']

// 요청 중이거나 서버가 처리한 결과가 있으면 그 의도는 사용한 것입니다.
// 서버에 닿지 못한 실패(응답과 오류 코드가 모두 없음)만 다시 누를 수 있으며,
// ChatProvider의 canResearchAgain 규칙과 같아야 합니다.
function isUsed(research: ChatResearch | undefined) {
    if (!research) return false
    return research.isPending || research.response !== null || research.errorCode !== null
}

export function ResearchIntentButtons({ researches, disabled, onResearch }: ResearchIntentButtonsProps) {
    const [isLocating, setIsLocating] = useState(false)
    const [locationNote, setLocationNote] = useState<string | null>(null)

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
                else setLocationNote('현재 위치를 확인하지 못해 위치 없이 검색합니다.')
            } finally {
                setIsLocating(false)
            }
        }

        await onResearch(intent, location)
    }

    return (
        <div className="research-actions">
            <p className="research-prompt">혹시 질문이 다른 의도였나요?</p>
            <div className="answer-actions" role="group" aria-label="질문 의도 선택">
                {INTENTS.map((intent) => (
                    <button
                        key={intent}
                        type="button"
                        disabled={disabled || isLocating || isUsed(researches.find((item) => item.intent === intent))}
                        onClick={() => void handleClick(intent)}
                    >
                        {isLocating && intent === 'STORE_DATA' ? '위치 확인 중...' : CHAT_INTENT_LABELS[intent]}
                    </button>
                ))}
            </div>
            {locationNote && <p className="research-note" role="status">{locationNote}</p>}
        </div>
    )
}