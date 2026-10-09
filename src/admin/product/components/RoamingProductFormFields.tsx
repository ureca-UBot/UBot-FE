import type { RoamingProductFormValues } from '../types/product'
import type { ProductFormFieldsProps } from '../types/productKind'
import { ProductCommonFields } from './ProductCommonFields'
import { ProductNumberField } from './ProductNumberField'

export function RoamingProductFormFields({ values, isCreate, onChange }: ProductFormFieldsProps<RoamingProductFormValues>) {
  return (
    <>
      <ProductCommonFields isCreate={isCreate} onChange={onChange} values={values} />

      <label>
        이용 국가
        <input
          maxLength={100}
          onChange={(event) => onChange({ country: event.target.value })}
          placeholder="예) 일본"
          value={values.country}
        />
        <small className="admin-product-form__hint">사용자 화면의 국가 검색은 이 값과 정확히 같아야 찾습니다.</small>
      </label>

      <ProductNumberField
        label="하루 이용료 (원)"
        onChange={(dailyFee) => onChange({ dailyFee })}
        value={values.dailyFee}
      />

      <ProductNumberField
        hint="1GB = 1024MB"
        label="데이터 제공량 (MB)"
        maxLength={12}
        onChange={(dataAmountMb) => onChange({ dataAmountMb })}
        value={values.dataAmountMb}
      />
    </>
  )
}
