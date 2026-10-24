import { HOME_PRODUCT_TYPE_LABELS } from '../../../shared/product/format'
import type { HomeProductType } from '../../../shared/product/types'
import type { HomeProductFormValues } from '../types/product'
import type { ProductFormFieldsProps } from '../types/productKind'
import { ProductCommonFields } from './ProductCommonFields'
import { ProductNumberField } from './ProductNumberField'

const HOME_PRODUCT_TYPES = Object.keys(HOME_PRODUCT_TYPE_LABELS) as HomeProductType[]

export function HomeProductFormFields({
  values,
  isCreate,
  onChange,
}: ProductFormFieldsProps<HomeProductFormValues>) {
  const isInternet = values.productType === 'INTERNET'

  return (
    <>
      <ProductCommonFields isCreate={isCreate} onChange={onChange} values={values} />

      {/* IPTV로 바꾸면 속도를 비웁니다. 값이 남은 채로 보내면 백엔드가 HOME-003으로 거절합니다. */}
      <label>
        상품 종류
        <select
          disabled={!isCreate}
          onChange={(event) => {
            const productType = event.target.value as HomeProductType
            onChange(productType === 'IPTV' ? { productType, speedMbps: '' } : { productType })
          }}
          value={values.productType}
        >
          {HOME_PRODUCT_TYPES.map((type) => (
            <option key={type} value={type}>
              {HOME_PRODUCT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <small className="admin-product-form__hint">
          {isCreate ? '등록한 뒤에는 바꿀 수 없습니다.' : '상품 종류는 바꿀 수 없습니다.'}
        </small>
      </label>

      <ProductNumberField
        label="월 요금 (원)"
        onChange={(monthlyFee) => onChange({ monthlyFee })}
        value={values.monthlyFee}
      />

      <ProductNumberField
        disabled={!isInternet}
        hint="인터넷만 입력합니다. 1Gbps = 1000Mbps"
        label="최대 속도 (Mbps)"
        maxLength={6}
        onChange={(speedMbps) => onChange({ speedMbps })}
        placeholder={isInternet ? undefined : 'IPTV는 입력하지 않음'}
        value={values.speedMbps}
      />
    </>
  )
}
