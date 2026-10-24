import { useEffect, useState } from 'react'
import { BUNDLE_TYPE_LABELS, formatMbps } from '../../../shared/product/format'
import type { BundleType, HomeProduct } from '../../../shared/product/types'
import { adminHomeProductApi } from '../api/productApi'
import type { BundleProductFormValues } from '../types/product'
import type { ProductFormFieldsProps } from '../types/productKind'
import { errorMessage } from '../utils/listState'
import { ProductCommonFields } from './ProductCommonFields'
import { ProductNumberField } from './ProductNumberField'

const BUNDLE_TYPES = Object.keys(BUNDLE_TYPE_LABELS) as BundleType[]

// 홈 결합에 연결할 수 있는 인터넷 상품입니다. 백엔드는 삭제되지 않은 인터넷 상품만 받습니다.
function useInternetProducts() {
  const [products, setProducts] = useState<HomeProduct[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminHomeProductApi
      .getProductList({ keyword: '', status: null, deleted: false, page: 0, size: 100 })
      .then((page) => {
        if (cancelled) return
        setProducts(
          page.content
            .map((product) => product.detail)
            .filter((detail) => detail.productType === 'INTERNET'),
        )
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught, '인터넷 상품 목록을 불러오지 못했습니다.'))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { products, error }
}

export function BundleProductFormFields({
  values,
  isCreate,
  onChange,
}: ProductFormFieldsProps<BundleProductFormValues>) {
  const internet = useInternetProducts()
  const isHome = values.bundleType === 'HOME'

  return (
    <>
      <ProductCommonFields isCreate={isCreate} onChange={onChange} values={values} />
      <label>
        결합 종류
        <select
          onChange={(event) => onChange({ bundleType: event.target.value as BundleType })}
          value={values.bundleType}
        >
          {BUNDLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {BUNDLE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <ProductNumberField
        label="할인 금액 (원)"
        onChange={(discountAmount) => onChange({ discountAmount })}
        value={values.discountAmount}
      />
      {/* 수정 요청에서 null은 "기존 값 유지"라서, 등록된 회선 수·인터넷 상품은 비워서 지울 수 없습니다. */}
      <ProductNumberField
        hint={
          isCreate
            ? '1~10회선. 비우면 회선 수 제한 없이 2회선부터 할인합니다.'
            : '1~10회선. 비워 두면 기존 값이 그대로 유지됩니다.'
        }
        label="결합 회선 수"
        maxLength={2}
        onChange={(lineCount) => onChange({ lineCount })}
        placeholder={isCreate ? '제한 없음' : '기존 값 유지'}
        value={values.lineCount}
      />
      {isHome && (
        <label>
          연결 인터넷 상품
          <select
            disabled={internet.products === null}
            onChange={(event) => onChange({ homeProductId: event.target.value })}
            value={values.homeProductId}
          >
            <option value="">
              {internet.products === null ? '불러오는 중...' : '인터넷 상품 선택'}
            </option>
            {internet.products?.map((product) => (
              <option key={product.homeProductId} value={String(product.homeProductId)}>
                {product.speedMbps === null
                  ? product.name
                  : `${product.name} (${formatMbps(product.speedMbps)})`}
              </option>
            ))}
          </select>
          <small className="admin-product-form__hint">
            {internet.error ?? '대표 회선 명의자가 이 인터넷을 이용 중일 때만 할인됩니다.'}
          </small>
        </label>
      )}
    </>
  )
}
