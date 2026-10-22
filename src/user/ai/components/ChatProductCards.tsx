import type { ChatProductCard, ChatProductData, ChatProductType } from '../types/chat'
import { formatWon } from '../utils/userDataFormat'
import '../../styles/sections/chat-user-data.css'

interface ChatProductCardsProps {
  productData?: ChatProductData | null
}

// 결합의 fee는 요금이 아니라 할인액입니다.
const FEE_PREFIX: Record<ChatProductType, string> = {
  PLAN: '월',
  ADDON: '월',
  ROAMING: '일',
  BUNDLE: '할인',
}

// 상품 정보 질문의 답변 아래에 답변에 쓰인 상품 카드를 그립니다.
// 가입 정보 카드의 스타일을 그대로 쓰며, 이름·요금·설명만 보여 줍니다.
export function ChatProductCards({ productData }: ChatProductCardsProps) {
  if (!productData || productData.products.length === 0) return null

  return (
    <div className="chat-user-data">
      <section className="ud-line" aria-label="답변에 쓰인 상품">
        {productData.products.map((card, index) => (
          <ProductCard key={`${card.type}-${card.name}-${index}`} card={card} />
        ))}
      </section>
    </div>
  )
}

function ProductCard({ card }: { card: ChatProductCard }) {
  return (
    <div className="chat-card ud-card">
      <div className="chat-card-pad">
        <div className="ud-head">
          <div className="ud-head-text">
            <h4>{card.name}</h4>
          </div>
        </div>
        {card.fee !== null && (
          <p className="pd-fee">
            <span className="pd-fee-label">{FEE_PREFIX[card.type]}</span>
            <strong>{formatWon(card.fee)}원</strong>
          </p>
        )}
        {card.description && <p className="ud-note">{card.description}</p>}
      </div>
    </div>
  )
}
