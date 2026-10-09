import type { ProductCommonValues } from '../types/product'

// 백엔드의 상품 코드 규칙과 같습니다.
const PRODUCT_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,49}$/

export function validateCommonValues(values: ProductCommonValues, isCreate: boolean): string | null {
  if (isCreate && !PRODUCT_CODE_PATTERN.test(values.code.trim())) {
    return '상품 코드는 영문 대문자로 시작하고, 대문자·숫자·밑줄(_)만 50자까지 쓸 수 있습니다.'
  }
  if (!values.name.trim()) return '상품명을 입력해 주세요.'
  return null
}

// 숫자 칸(ProductNumberField)은 숫자만 남기므로, 비어 있지 않으면 0 이상의 정수입니다.
export function toNullableNumber(text: string) {
  return text === '' ? null : Number(text)
}

export function toText(value: number | null) {
  return value === null ? '' : String(value)
}

// 백엔드는 빈 설명을 null로 저장합니다. 같은 기준으로 보냅니다.
export function descriptionOrNull(text: string) {
  return text.trim() ? text.trim() : null
}
