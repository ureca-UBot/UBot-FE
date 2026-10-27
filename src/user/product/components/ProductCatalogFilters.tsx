import { useEffect, useState } from 'react'
import type { ProductCatalogKind } from '../catalog'

interface ProductCatalogFiltersProps {
  kind: ProductCatalogKind
  option: string
  country: string
  onOptionChange: (value: string) => void
  onCountryChange: (value: string) => void
}

// 분류 선택 UI와 국가 목록 로딩을 상품 목록·페이지 상태에서 분리합니다.
export function ProductCatalogFilters({
  kind,
  option,
  country,
  onOptionChange,
  onCountryChange,
}: ProductCatalogFiltersProps) {
  const [countries, setCountries] = useState<string[]>([])
  const [loading, setLoading] = useState(kind.filtersByCountry)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!kind.getCountries) return
    let cancelled = false
    void kind.getCountries().then(
      (items) => {
        if (cancelled) return
        setCountries(items)
        setError(false)
        setLoading(false)
      },
      () => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [kind, revision])

  const choices = kind.filter
    ? [{ value: '', label: kind.filter.allLabel }, ...kind.filter.options]
    : kind.filtersByCountry
      ? [{ value: '', label: '전체 국가' }, ...countries.map((value) => ({ value, label: value }))]
      : []
  if (!choices.length) return null
  const selected = kind.filtersByCountry ? country : option
  const change = kind.filtersByCountry ? onCountryChange : onOptionChange

  return (
    <div
      className="product-catalog-filters"
      role="group"
      aria-label={kind.filter?.label ?? '이용 국가'}
    >
      {choices.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={selected === value}
          onClick={() => change(value)}
        >
          {label}
        </button>
      ))}
      {loading && <span role="status">국가 목록을 불러오는 중입니다.</span>}
      {error && (
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setError(false)
            setRevision((value) => value + 1)
          }}
        >
          국가 목록 다시 불러오기
        </button>
      )}
    </div>
  )
}
