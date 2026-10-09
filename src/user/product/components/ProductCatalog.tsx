import { useEffect, useState, type FormEvent } from 'react'
import type { ProductCard, ProductCatalogKind } from '../catalog'
import { ProductDetailDialog } from './ProductDetailDialog'

// 한 종류의 상품 목록입니다. 종류가 바뀌면 key로 새로 마운트해 검색어와 목록을 처음 상태로 돌립니다.
export function ProductCatalog({ kind }: { kind: ProductCatalogKind }) {
  const [keywordInput, setKeywordInput] = useState('')
  const [countryInput, setCountryInput] = useState('')
  const [filter, setFilter] = useState({ keyword: '', country: '' })
  const [page, setPage] = useState(0)
  const [cards, setCards] = useState<ProductCard[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [detailId, setDetailId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCards() {
      setLoading(true)
      try {
        const next = await kind.getCards({ ...filter, page })
        if (cancelled) return
        // 첫 페이지는 새 검색 결과이므로 바꾸고, 그다음 페이지는 "더 보기"이므로 이어 붙입니다.
        setCards((current) => (page === 0 ? next.content : [...current, ...next.content]))
        setTotalElements(next.totalElements)
        setHasMore(!next.last)
        setError(null)
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '상품 목록을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchCards()
    return () => {
      cancelled = true
    }
  }, [kind, filter, page, revision])

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilter({ keyword: keywordInput.trim(), country: countryInput.trim() })
    setPage(0)
  }

  // 실패한 페이지를 그대로 다시 요청합니다. page를 올리면 실패한 페이지를 건너뛰게 됩니다.
  function retry() {
    setRevision((current) => current + 1)
  }

  const filtered = Boolean(filter.keyword || filter.country)

  return (
    <div className="product-catalog">
      <form className="product-catalog-search" onSubmit={search} role="search">
        <input
          aria-label={`${kind.label} 검색어`}
          maxLength={100}
          onChange={(event) => setKeywordInput(event.target.value)}
          placeholder={kind.searchPlaceholder}
          value={keywordInput}
        />
        {kind.filtersByCountry && (
          <input
            aria-label="이용 국가"
            className="product-catalog-country"
            maxLength={100}
            onChange={(event) => setCountryInput(event.target.value)}
            placeholder="국가 (예: 일본)"
            value={countryInput}
          />
        )}
        <button type="submit">검색</button>
      </form>

      {cards.length === 0 ? (
        error ? (
          <div className="product-catalog-status" role="alert">
            <p>{error}</p>
            <button onClick={retry} type="button">다시 시도</button>
          </div>
        ) : (
          <p className="product-catalog-status" role="status">
            {loading ? `${kind.label} 목록을 불러오는 중입니다.` : filtered ? '조건에 맞는 상품이 없습니다.' : kind.emptyMessage}
          </p>
        )
      ) : (
        <>
          <p className="product-catalog-count">총 {totalElements.toLocaleString('ko-KR')}개</p>
          <div className="product-catalog-grid">
            {cards.map((card) => (
              <article className="product-card" key={card.id}>
                <small>{card.badge}</small>
                <h3>{card.name}</h3>
                {card.summary && <p>{card.summary}</p>}
                {card.specs.length > 0 && (
                  <ul>
                    {card.specs.map((spec) => <li key={spec}>{spec}</li>)}
                  </ul>
                )}
                <div className="product-card-price"><span>{card.priceLabel}</span><b>{card.price}</b></div>
                <button className="product-card-open" onClick={() => setDetailId(card.id)} type="button">자세히 보기</button>
              </article>
            ))}
          </div>
          {error ? (
            <div className="product-catalog-more-error" role="alert">
              <p>{error}</p>
              <button className="product-catalog-more" onClick={retry} type="button">다시 시도</button>
            </div>
          ) : hasMore && (
            <button
              className="product-catalog-more"
              disabled={loading}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              {loading ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </>
      )}

      {detailId !== null && (
        <ProductDetailDialog kind={kind} onClose={() => setDetailId(null)} productId={detailId} />
      )}
    </div>
  )
}
