import type { BundleProductFormValues } from '../types/product'
import type { ProductFormFieldsProps } from '../types/productKind'
import { ProductCommonFields } from './ProductCommonFields'
import { ProductNumberField } from './ProductNumberField'

export function BundleProductFormFields({ values, isCreate, onChange }: ProductFormFieldsProps<BundleProductFormValues>) {
  return (
    <>
      <ProductCommonFields isCreate={isCreate} onChange={onChange} values={values} />
      <ProductNumberField
        label="할인 금액 (원)"
        onChange={(discountAmount) => onChange({ discountAmount })}
        value={values.discountAmount}
      />
    </>
  )
}
