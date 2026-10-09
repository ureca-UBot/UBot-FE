import type { ProductCommonValues } from '../types/product'
import type { ProductFormFieldsProps } from '../types/productKind'

// 4종이 모두 갖는 칸입니다: 상품 코드, 상품명, 설명.
export function ProductCommonFields({ values, isCreate, onChange }: ProductFormFieldsProps<ProductCommonValues>) {
  return (
    <>
      <label>
        상품 코드
        <input
          disabled={!isCreate}
          maxLength={50}
          onChange={(event) => onChange({ code: event.target.value.toUpperCase() })}
          placeholder="예) PRODUCT_CODE_01"
          value={values.code}
        />
        <small className="admin-product-form__hint">
          {isCreate ? '영문 대문자·숫자·밑줄(_). 등록한 뒤에는 바꿀 수 없습니다.' : '상품 코드는 바꿀 수 없습니다.'}
        </small>
      </label>

      <label>
        상품명
        <input maxLength={150} onChange={(event) => onChange({ name: event.target.value })} value={values.name} />
      </label>

      <label className="admin-product-form__full">
        설명
        <textarea
          maxLength={10000}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="사용자 화면의 상품 상세에 보이는 설명입니다."
          value={values.description}
        />
      </label>
    </>
  )
}
