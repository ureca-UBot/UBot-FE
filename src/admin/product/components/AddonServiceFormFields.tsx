import { ADDON_CATEGORY_LABELS } from '../../../shared/product/format'
import type { AddonCategory } from '../../../shared/product/types'
import type { AddonServiceFormValues } from '../types/product'
import type { ProductFormFieldsProps } from '../types/productKind'
import { ProductCommonFields } from './ProductCommonFields'
import { ProductNumberField } from './ProductNumberField'

const ADDON_CATEGORIES = Object.keys(ADDON_CATEGORY_LABELS) as AddonCategory[]

export function AddonServiceFormFields({
  values,
  isCreate,
  onChange,
}: ProductFormFieldsProps<AddonServiceFormValues>) {
  return (
    <>
      <ProductCommonFields isCreate={isCreate} onChange={onChange} values={values} />
      <label>
        분류
        <select
          onChange={(event) => onChange({ category: event.target.value as AddonCategory })}
          value={values.category}
        >
          {ADDON_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {ADDON_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        <small className="admin-product-form__hint">
          사용자 스토어의 부가서비스 분류 필터에 쓰입니다.
        </small>
      </label>
      <ProductNumberField
        hint="무료 서비스는 0을 입력합니다."
        label="월 이용료 (원)"
        onChange={(monthlyFee) => onChange({ monthlyFee })}
        value={values.monthlyFee}
      />
    </>
  )
}
