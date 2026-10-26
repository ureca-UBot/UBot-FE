import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { productCatalogKinds, type ProductCatalogKey } from '../../product/catalog'
import { ProductName } from '../../product/components/ProductName'
import {
  CHAT_PRODUCT_LIMIT,
  type ChatProductCard,
  type ChatProductData,
  type ChatProductType,
} from '../types/chat'
import { formatWon } from '../utils/userDataFormat'
import { ChatProductRefine } from './ChatProductRefine'
import '../../styles/sections/chat-user-data.css'

const FEE_PREFIX: Record<ChatProductType, string> = {
  PLAN: '월',
  ADDON: '월',
  ROAMING: '일',
  BUNDLE: '월 할인',
}
const CATALOG_KEY: Record<ChatProductType, ProductCatalogKey> = {
  PLAN: 'plans',
  ADDON: 'addons',
  ROAMING: 'roaming',
  BUNDLE: 'bundles',
}

export function ChatProductCards({
  productData,
  onNavigateToStore,
}: {
  productData?: ChatProductData | null
  onNavigateToStore?: () => void
}) {
  if (!productData || (!productData.products.length && !productData.refine)) return null
  const list = (data: ChatProductData) => (
    <ProductList products={data.products} onNavigateToStore={onNavigateToStore} />
  )

  return (
    <div className="chat-user-data chat-product-data">
      {productData.refine?.groups.length ? (
        <ChatProductRefine
          key={JSON.stringify(productData.refine)}
          refine={productData.refine}
          initialProducts={productData.products}
        >
          {list}
        </ChatProductRefine>
      ) : (
        list(productData)
      )}
    </div>
  )
}

function ProductList({
  products,
  onNavigateToStore,
}: {
  products: ChatProductCard[]
  onNavigateToStore?: () => void
}) {
  const trackRef = useRef<HTMLElement>(null)
  const [edges, setEdges] = useState({ atStart: true, atEnd: true })
  const visibleProducts = products.slice(0, CHAT_PRODUCT_LIMIT)

  function updateEdges() {
    const track = trackRef.current
    if (!track) return
    setEdges({
      atStart: track.scrollLeft <= 1,
      atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
    })
  }

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(updateEdges)
    observer.observe(track)
    return () => observer.disconnect()
  }, [visibleProducts.length])

  function move(direction: number) {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild as HTMLElement | null
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0
    track.scrollBy({
      left: direction * ((card?.offsetWidth ?? track.clientWidth) + gap),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  return (
    <div className="pd-carousel">
      {(!edges.atStart || !edges.atEnd) && (
        <div className="pd-list-controls" role="group" aria-label="상품 목록 이동">
          <span>옆으로 넘겨보기</span>
          <button
            type="button"
            aria-label="이전 상품"
            disabled={edges.atStart}
            onClick={() => move(-1)}
          >
            <ProductArrow direction="prev" />
          </button>
          <button
            type="button"
            aria-label="다음 상품"
            disabled={edges.atEnd}
            onClick={() => move(1)}
          >
            <ProductArrow direction="next" />
          </button>
        </div>
      )}
      <section
        className="ud-line pd-list"
        aria-label="상품 목록"
        ref={trackRef}
        tabIndex={0}
        onScroll={updateEdges}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault()
            move(event.key === 'ArrowRight' ? 1 : -1)
          }
        }}
      >
        {visibleProducts.map((card, index) => (
          <ProductCard
            key={`${card.type}-${card.name}-${index}`}
            card={card}
            onNavigateToStore={onNavigateToStore}
          />
        ))}
      </section>
    </div>
  )
}

function ProductArrow({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path
        d={direction === 'next' ? 'm6 3 5 5-5 5' : 'm10 3-5 5 5 5'}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

// 현재 챗봇 응답에는 상품 ID가 없어 공개 목록의 정확한 이름으로 확인한 ID를 사용합니다.
// 이름 일부가 같은 다른 상품으로 이동하지 않도록 모든 검색 페이지에서 완전히 일치하는 이름만 고릅니다.
async function findProduct(card: ChatProductCard) {
  const kind = productCatalogKinds.find((item) => item.key === CATALOG_KEY[card.type])
  if (!kind) return null
  let page = 0
  while (true) {
    const result = await kind.getCards({ keyword: card.name, country: '', option: '', page })
    const found = result.content.find((item) => item.name === card.name)
    if (found) return { category: kind.key, productId: found.id }
    if (result.last || !result.content.length) return null
    page += 1
  }
}

function ProductCard({
  card,
  onNavigateToStore,
}: {
  card: ChatProductCard
  onNavigateToStore?: () => void
}) {
  const navigate = useNavigate()
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'missing' | 'failed'>('idle')
  const summary = card.specs?.slice(0, 2).join(' · ') || card.highlights?.[0] || card.description
  const nameNetwork = card.name.match(/5G(?![a-z\d])|LTE/i)?.[0]

  async function openProduct() {
    setLookup('loading')
    try {
      const found = await findProduct(card)
      if (!found) {
        setLookup('missing')
        return
      }
      const params = new URLSearchParams({
        category: found.category,
        productId: String(found.productId),
      })
      setLookup('idle')
      navigate(`/store?${params}`)
      onNavigateToStore?.()
    } catch {
      setLookup('failed')
    }
  }

  return (
    <article className="chat-card ud-card pd-card" aria-label={card.name}>
      <div className="chat-card-pad">
        <h4 className="pd-name" title={card.name} aria-label={card.name}>
          <ProductName name={card.name} />
        </h4>
        {card.network && card.network.toUpperCase() !== nameNetwork?.toUpperCase() && (
          <span className="pd-network">{card.network}</span>
        )}
        {card.fee !== null && (
          <p className="pd-fee">
            <span className="pd-fee-label">{FEE_PREFIX[card.type]}</span>
            <strong>{formatWon(card.fee)}원</strong>
          </p>
        )}
        {summary && (
          <p className="pd-summary" title={summary}>
            {summary}
          </p>
        )}
        <div className="answer-actions pd-actions">
          <button
            className="primary"
            disabled={lookup === 'loading'}
            onClick={() => void openProduct()}
            type="button"
          >
            {lookup === 'loading' ? '상품 확인 중...' : '상품 가입 / 정보'}
          </button>
          {(lookup === 'missing' || lookup === 'failed') && (
            <small className="pd-lookup-note" role="status">
              {lookup === 'missing'
                ? '판매 중인 상품 정보를 찾지 못했습니다.'
                : '상품 정보를 불러오지 못했습니다. 다시 눌러 주세요.'}
            </small>
          )}
        </div>
      </div>
    </article>
  )
}
