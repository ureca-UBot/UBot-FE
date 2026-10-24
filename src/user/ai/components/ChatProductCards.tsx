import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import {
  productCatalogKinds,
  type ProductCatalogKey,
  type ProductCatalogKind,
} from '../../product/catalog'
import { ProductDetailDialog } from '../../product/components/ProductDetailDialog'
import type { ChatProductCard, ChatProductData, ChatProductType } from '../types/chat'
import { productBullets, productFee } from '../utils/productCardFormat'
import '../../styles/sections/chat-user-data.css'

interface ChatProductCardsProps {
  productData?: ChatProductData | null
}

interface OpenDetail {
  kind: ProductCatalogKind
  productId: number
}

// 상품 정보 화면(StorePage)의 종류 탭과 같은 조회 방식을 씁니다.
const CATALOG_KEY: Record<ChatProductType, ProductCatalogKey> = {
  PLAN: 'plans',
  ADDON: 'addons',
  ROAMING: 'roaming',
  BUNDLE: 'bundles',
}

// 이만큼 움직여야 드래그로 보고, 그보다 짧으면 클릭으로 둡니다.
const DRAG_THRESHOLD_PX = 5

// 상품 정보 질문의 답변 아래에 답변에 쓰인 상품 카드를 그립니다.
// 가입 정보 카드의 스타일을 그대로 쓰며, 이름·네트워크 뱃지·요금(한 장일 때는 선택약정 할인가 포함)·글머리표 항목과
// 상세 보기 버튼만 둡니다.
// 상품이 여러 개면 가로로 넘겨 보는 목록으로 바꿉니다.
export function ChatProductCards({ productData }: ChatProductCardsProps) {
  const [detail, setDetail] = useState<OpenDetail | null>(null)
  const closeDetail = useCallback(() => setDetail(null), [])

  if (!productData || productData.products.length === 0) return null
  const { products } = productData

  return (
    <div className="chat-user-data">
      {products.length === 1 ? (
        <section className="ud-line" aria-label="답변에 쓰인 상품">
          <ProductCard card={products[0]} onOpenDetail={setDetail} />
        </section>
      ) : (
        <ProductCarousel products={products} onOpenDetail={setDetail} />
      )}
      {detail && (
        <ProductDetailDialog
          kind={detail.kind}
          productId={detail.productId}
          onClose={closeDetail}
        />
      )}
    </div>
  )
}

// 카드에는 상품 ID가 없으므로 상품 정보 화면의 목록 조회를 이름으로 검색해 같은 이름의 상품을 찾습니다.
async function findProduct(card: ChatProductCard): Promise<OpenDetail | null> {
  const kind = productCatalogKinds.find((item) => item.key === CATALOG_KEY[card.type])
  if (!kind) return null
  const page = await kind.getCards({ keyword: card.name, country: '', option: '', page: 0 })
  const found = page.content.find((item) => item.name === card.name)
  return found ? { kind, productId: found.id } : null
}

function ProductCard({
  card,
  inCarousel = false,
  onOpenDetail,
}: {
  card: ChatProductCard
  inCarousel?: boolean
  onOpenDetail: (detail: OpenDetail) => void
}) {
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'missing' | 'failed'>('idle')
  const fee = productFee(card)
  const bullets = productBullets(card)
  // 선택약정 할인가는 폭이 좁은 가로 목록에서는 줄이 너무 길어져 한 장일 때만 보여 줍니다.
  const feeNote = inCarousel ? null : card.feeNote

  const handleDetail = async () => {
    setLookup('loading')
    try {
      const found = await findProduct(card)
      setLookup(found ? 'idle' : 'missing')
      if (found) onOpenDetail(found)
    } catch {
      setLookup('failed')
    }
  }

  return (
    <div className="chat-card ud-card pd-card">
      <div className="chat-card-pad">
        <div className="ud-head">
          <h4 className="pd-name" title={card.name}>
            {card.name}
          </h4>
          {card.network && <span className="ud-badge">{card.network}</span>}
        </div>
        {fee && (
          <p className="pd-fee">
            {fee.prefix && <span className="pd-fee-label">{fee.prefix}</span>}
            <strong>{fee.amount}</strong>
          </p>
        )}
        {feeNote && <p className="pd-fee-note">{feeNote}</p>}
        {bullets.length > 0 && (
          <ul className="pd-bullets">
            {bullets.map((bullet, index) => (
              <li key={`${index}-${bullet}`}>{bullet}</li>
            ))}
          </ul>
        )}
        <div className="pd-actions">
          <button
            className="pd-detail"
            disabled={lookup === 'loading'}
            onClick={() => void handleDetail()}
            type="button"
          >
            {lookup === 'loading' ? '찾는 중...' : '자세히 보기'}
            <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14">
              <path
                d="M6 3h7v7M13 3 4 12"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </button>
          {(lookup === 'missing' || lookup === 'failed') && (
            <small className="pd-lookup-note" role="status">
              {lookup === 'missing'
                ? '상품 정보에서 찾지 못했습니다.'
                : '상품 정보를 불러오지 못했습니다.'}
            </small>
          )}
        </div>
      </div>
    </div>
  )
}

function ChevronIcon({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path
        d={direction === 'next' ? 'm6 3 5 5-5 5' : 'm10 3-5 5 5 5'}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

interface DragState {
  pointerId: number
  startX: number
  startScroll: number
  moved: boolean
}

// 상품이 여러 개일 때의 가로 목록입니다. 마우스 드래그, 좌우 버튼, 터치 스크롤로 넘깁니다.
// 끝에 닿은 쪽 버튼은 숨깁니다.
function ProductCarousel({
  products,
  onOpenDetail,
}: {
  products: ChatProductCard[]
  onOpenDetail: (detail: OpenDetail) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  // 드래그를 끝낸 직후의 클릭이 카드 버튼을 누르지 않도록 막습니다.
  const suppressClickRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [edges, setEdges] = useState({ atStart: true, atEnd: false })

  const updateEdges = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const maxScroll = track.scrollWidth - track.clientWidth
    setEdges({ atStart: track.scrollLeft <= 1, atEnd: track.scrollLeft >= maxScroll - 1 })
  }, [])

  // 처음 관찰할 때도 콜백이 불리므로 첫 버튼 상태도 여기서 정해집니다.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(updateEdges)
    observer.observe(track)
    return () => observer.disconnect()
  }, [updateEdges])

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild as HTMLElement | null
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollBy({
      left: direction * (card ? card.offsetWidth + gap : track.clientWidth),
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  // 터치는 브라우저 기본 스크롤에 맡기고 마우스만 직접 끌어 옮깁니다.
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    suppressClickRef.current = false
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: event.currentTarget.scrollLeft,
      moved: false,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    if (!drag.moved) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return
      drag.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      window.getSelection()?.removeAllRanges()
      setIsDragging(true)
    }
    event.currentTarget.scrollLeft = drag.startScroll - deltaX
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (!drag.moved) return
    suppressClickRef.current = true
    setIsDragging(false)
  }

  return (
    <section className="pd-carousel" aria-label={`답변에 쓰인 상품 ${products.length}개`}>
      <div
        className={`pd-track${isDragging ? ' is-dragging' : ''}`}
        ref={trackRef}
        onScroll={updateEdges}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return
          suppressClickRef.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        {products.map((card, index) => (
          <ProductCard
            key={`${card.type}-${card.name}-${index}`}
            card={card}
            inCarousel
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
      <button
        className="pd-nav prev"
        aria-label="이전 상품"
        disabled={edges.atStart}
        onClick={() => scrollByCard(-1)}
        type="button"
      >
        <ChevronIcon direction="prev" />
      </button>
      <button
        className="pd-nav next"
        aria-label="다음 상품"
        disabled={edges.atEnd}
        onClick={() => scrollByCard(1)}
        type="button"
      >
        <ChevronIcon direction="next" />
      </button>
    </section>
  )
}
