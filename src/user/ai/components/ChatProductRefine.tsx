import { useEffect, useState, type ReactNode } from 'react'
import { productSearchApi } from '../api/productSearchApi'
import {
  CHAT_PRODUCT_LIMIT,
  type ChatProductAvailability,
  type ChatProductCard,
  type ChatProductData,
  type ChatProductRefine as ProductRefine,
  type ChatProductSearchRequest,
  type ChatProductSearchResponse,
} from '../types/chat'

type Lookup = { key: string; revision: number } & (
  | { status: 'options'; availability: ChatProductAvailability }
  | { status: 'results'; result: ChatProductSearchResponse }
  | { status: 'failed' }
)

export function ChatProductRefine({
  refine,
  initialProducts,
  children,
}: {
  refine: ProductRefine
  initialProducts: ChatProductCard[]
  children: (data: ChatProductData) => ReactNode
}) {
  // null은 사용자가 명시적으로 고른 '상관없음'입니다. 배열에는 확인한 앞 단계만 담습니다.
  const [choices, setChoices] = useState<(string | null)[]>([])
  const [keyword, setKeyword] = useState(refine.keyword)
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [revision, setRevision] = useState(0)
  const group = refine.groups[choices.length]
  const conditions = Object.fromEntries(
    choices.flatMap((value, index) => (value === null ? [] : [[refine.groups[index].key, value]])),
  )
  const queryKey = JSON.stringify({ type: refine.type, keyword, conditions, key: group?.key })
  const current = lookup?.key === queryKey && lookup.revision === revision ? lookup : null

  useEffect(() => {
    let cancelled = false
    const request = JSON.parse(queryKey) as ChatProductSearchRequest & { key?: string }

    async function load() {
      if (request.key) {
        const availability = await productSearchApi.options({ ...request, key: request.key })
        if (cancelled) return
        if (availability.key !== request.key) throw new Error('상품 조건을 확인하지 못했습니다.')
        // 질문에서 적용된 임의 구간(예: 6만원 이하)은 기본 선택지에 없을 수 있습니다.
        // 이 값도 실제 상품 조회로 확인한 뒤에만 선택하게 합니다.
        const options = refine.groups.find((item) => item.key === request.key)?.options ?? []
        const missing = options.filter(
          (option) => !availability.options.some((item) => item.value === option.value),
        )
        const extra = await Promise.all(
          missing.map(async ({ value }) => {
            const result = await productSearchApi.search({
              type: request.type,
              keyword: request.keyword,
              conditions: { ...request.conditions, [request.key!]: value },
            })
            return {
              value,
              available:
                (result.productData.refine?.total ?? result.productData.products.length) > 0,
            }
          }),
        )
        if (!cancelled)
          setLookup({
            key: queryKey,
            revision,
            status: 'options',
            availability: {
              ...availability,
              options: [...availability.options, ...extra],
            },
          })
      } else {
        const result = await productSearchApi.search(request)
        if (!cancelled) setLookup({ key: queryKey, revision, status: 'results', result })
      }
    }

    void load().catch(() => {
      if (!cancelled) setLookup({ key: queryKey, revision, status: 'failed' })
    })
    return () => {
      cancelled = true
    }
  }, [queryKey, revision, refine.groups])

  const availability = current?.status === 'options' ? current.availability : null
  const result = current?.status === 'results' ? current.result : null
  const products = result?.productData.products ?? []
  const total = result?.productData.refine?.total ?? products.length

  function edit(index: number) {
    setChoices((previous) => previous.slice(0, index))
  }

  return (
    <section className="pd-refine" aria-label="상품 조건 선택" aria-busy={!current}>
      <div className="pd-refine-heading">
        <h4>나에게 맞는 상품 찾기</h4>
        <span>{group ? `${choices.length + 1} / ${refine.groups.length}단계` : '선택 완료'}</span>
      </div>
      {keyword && (
        <button
          className="pd-keyword"
          onClick={() => {
            setKeyword(null)
            setChoices([])
          }}
          type="button"
          aria-label={`검색어 ${keyword} 제거`}
        >
          검색어: {keyword}
          <span aria-hidden="true">×</span>
        </button>
      )}
      {choices.length > 0 && (
        <div className="pd-chosen" aria-label="선택한 상품 조건">
          {choices.map((value, index) => {
            const selected = refine.groups[index]
            const label =
              selected.options.find((option) => option.value === value)?.label ?? '상관없음'
            return (
              <button
                key={selected.key}
                onClick={() => edit(index)}
                type="button"
                aria-label={`${selected.label}: ${label} 변경`}
              >
                <span>{selected.label}</span> {label}
                <span aria-hidden="true">×</span>
              </button>
            )
          })}
        </div>
      )}
      {group && (
        <fieldset className="pd-filter-step" disabled={!availability}>
          <legend>{group.label} 조건을 선택해 주세요.</legend>
          <div className="pd-filter-options">
            {group.options.map((option) => {
              const available =
                availability?.options.some(
                  (item) => item.value === option.value && item.available,
                ) ?? false
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!available}
                  aria-pressed={group.selected === option.value}
                  onClick={() => setChoices((previous) => [...previous, option.value])}
                >
                  {option.label}
                  {availability && !available && <small>상품 없음</small>}
                </button>
              )
            })}
            {group.anyAllowed && (
              <button
                type="button"
                disabled={!availability?.anyAvailable}
                onClick={() => setChoices((previous) => [...previous, null])}
              >
                상관없음
              </button>
            )}
          </div>
        </fieldset>
      )}
      {!current && (
        <p className="pd-filter-status" role="status">
          {group
            ? '선택 가능한 상품 조건을 확인하고 있습니다.'
            : '조건에 맞는 상품을 찾고 있습니다.'}
        </p>
      )}
      {current?.status === 'failed' && (
        <div className="pd-filter-status" role="alert">
          <p>{group ? '상품 조건을 확인하지 못했습니다.' : '상품을 불러오지 못했습니다.'}</p>
          <button onClick={() => setRevision((value) => value + 1)} type="button">
            다시 시도
          </button>
        </div>
      )}
      {availability && !availability.anyAvailable && (
        <div className="pd-filter-status" role="status">
          <p>
            현재 조건에 맞는 상품이 없습니다.{' '}
            {keyword ? '검색어를 제거하거나 앞 조건을 바꿔 주세요.' : '앞 조건을 바꿔 주세요.'}
          </p>
          {choices.length > 0 && (
            <button onClick={() => edit(choices.length - 1)} type="button">
              이전 조건 변경
            </button>
          )}
        </div>
      )}
      {choices.length === 0 && refine.total > 0 && availability?.anyAvailable !== false && (
        <InitialProductResults
          request={{
            type: refine.type,
            keyword,
            conditions: Object.fromEntries(
              refine.groups.flatMap((item) =>
                item.selected === null ? [] : [[item.key, item.selected]],
              ),
            ),
          }}
          products={keyword === refine.keyword ? initialProducts : []}
          total={refine.total}
        >
          {children}
        </InitialProductResults>
      )}
      {result && (
        <div className="pd-filter-results" aria-live="polite">
          <p className="pd-result-count">
            조건에 맞는 상품 {total.toLocaleString('ko-KR')}개
            {total > Math.min(products.length, CHAT_PRODUCT_LIMIT) && (
              <span> · {Math.min(products.length, CHAT_PRODUCT_LIMIT)}개 표시</span>
            )}
          </p>
          {products.length > 0 ? (
            children(result.productData)
          ) : (
            <p className="pd-filter-status">{result.answer}</p>
          )}
          <button className="pd-reset" onClick={() => edit(0)} type="button">
            조건 다시 선택
          </button>
        </div>
      )}
    </section>
  )
}

// 많은 상품의 첫 답변은 안내 문장과 refine만 내려옵니다. 기존 조건 그대로 목록을 조회합니다.
function InitialProductResults({
  request,
  products,
  total,
  children,
}: {
  request: ChatProductSearchRequest
  products: ChatProductCard[]
  total: number
  children: (data: ChatProductData) => ReactNode
}) {
  const [revision, setRevision] = useState(0)
  const [lookup, setLookup] = useState<{
    key: string
    revision: number
    result?: ChatProductSearchResponse
  } | null>(null)
  const queryKey = JSON.stringify(request)
  const supplied = products.length > 0
  const current = lookup?.key === queryKey && lookup.revision === revision ? lookup : null

  useEffect(() => {
    if (supplied) return
    let cancelled = false
    void productSearchApi
      .search(JSON.parse(queryKey) as ChatProductSearchRequest)
      .then((result) => {
        if (!cancelled) setLookup({ key: queryKey, revision, result })
      })
      .catch(() => {
        if (!cancelled) setLookup({ key: queryKey, revision })
      })
    return () => {
      cancelled = true
    }
  }, [queryKey, revision, supplied])

  const data = supplied ? { products } : current?.result?.productData
  const count = supplied ? total : (data?.refine?.total ?? data?.products.length ?? 0)

  return (
    <div className="pd-filter-results" aria-live="polite">
      {data?.products.length ? (
        <>
          <p className="pd-result-count">
            조건에 맞는 상품 {count.toLocaleString('ko-KR')}개
            {count > Math.min(data.products.length, CHAT_PRODUCT_LIMIT) && (
              <span> · {Math.min(data.products.length, CHAT_PRODUCT_LIMIT)}개 표시</span>
            )}
          </p>
          {children(data)}
        </>
      ) : current ? (
        <div className="pd-filter-status" role="alert">
          <p>
            {data && count === 0
              ? '현재 조건에 맞는 상품이 없습니다.'
              : '상품 항목을 불러오지 못했습니다.'}
          </p>
          <button onClick={() => setRevision((value) => value + 1)} type="button">
            상품 다시 불러오기
          </button>
        </div>
      ) : (
        <p className="pd-filter-status" role="status">
          조건에 맞는 상품을 찾고 있습니다.
        </p>
      )}
    </div>
  )
}
