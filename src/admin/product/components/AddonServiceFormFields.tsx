import type { AddonServiceFormValues } from '../types/product'
import type { ProductFormFieldsProps } from '../types/productKind'
import { ProductCommonFields } from './ProductCommonFields'
import { ProductNumberField } from './ProductNumberField'

export function AddonServiceFormFields({ values, isCreate, onChange }: ProductFormFieldsProps<AddonServiceFormValues>) {
  return (
    <>
      <ProductCommonFields isCreate={isCreate} onChange={onChange} values={values} />
      <ProductNumberField
        hint="무료 서비스는 0을 입력합니다."
        label="월 이용료 (원)"
        onChange={(monthlyFee) => onChange({ monthlyFee })}
        value={values.monthlyFee}
      />
    </>
  )
}
