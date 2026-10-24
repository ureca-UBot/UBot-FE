import { BUNDLE_TYPE_LABELS, formatLineCount, formatWon } from '../../../shared/product/format'
import type { BundleProduct } from '../../../shared/product/types'
import { adminBundleProductApi } from '../api/productApi'
import { BundleProductFormFields } from '../components/BundleProductFormFields'
import type {
  BundleProductCreateRequest,
  BundleProductFormValues,
  BundleProductUpdateRequest,
} from '../types/product'
import type { ProductKind } from '../types/productKind'
import {
  descriptionOrNull,
  toNullableNumber,
  toText,
  validateCommonValues,
} from '../utils/formValues'

function validate(values: BundleProductFormValues, isCreate: boolean): string | null {
  const common = validateCommonValues(values, isCreate)
  if (common) return common
  if (values.discountAmount === '') return '할인 금액을 입력해 주세요.'
  const lineCount = toNullableNumber(values.lineCount)
  if (lineCount !== null && (lineCount < 1 || lineCount > 10))
    return '결합 회선 수는 1~10 사이로 입력해 주세요.'
  // 홈 결합은 인터넷 상품이 연결되어 있어야 할인이 적용됩니다. 수정할 때 비우면 기존 상품이 유지됩니다.
  if (isCreate && values.bundleType === 'HOME' && values.homeProductId === '')
    return '홈 결합에 연결할 인터넷 상품을 골라 주세요.'
  return null
}

function toUpdateRequest(values: BundleProductFormValues): BundleProductUpdateRequest {
  return {
    name: values.name.trim(),
    description: descriptionOrNull(values.description),
    discountAmount: Number(values.discountAmount),
    bundleType: values.bundleType,
    lineCount: toNullableNumber(values.lineCount),
    // 홈 결합이 아니면 인터넷 상품을 보내지 않습니다.
    homeProductId: values.bundleType === 'HOME' ? toNullableNumber(values.homeProductId) : null,
  }
}

export const bundleProductKind: ProductKind<
  BundleProduct,
  BundleProductFormValues,
  BundleProductCreateRequest,
  BundleProductUpdateRequest
> = {
  label: '결합상품',
  description: '활성 상태인 결합상품만 사용자 스토어의 결합상품 탭에 보입니다.',
  api: adminBundleProductApi,
  idOf: (detail) => detail.bundleProductId,
  codeOf: (detail) => detail.code,
  nameOf: (detail) => detail.name,
  columns: [
    { header: '결합 종류', text: (detail) => BUNDLE_TYPE_LABELS[detail.bundleType] },
    { header: '회선 수', text: (detail) => formatLineCount(detail.lineCount) },
    { header: '할인 금액', text: (detail) => formatWon(detail.discountAmount) },
  ],
  blankValues: {
    code: '',
    name: '',
    description: '',
    discountAmount: '',
    bundleType: 'FAMILY',
    lineCount: '',
    homeProductId: '',
  },
  valuesFrom: (detail) => ({
    code: detail.code,
    name: detail.name,
    description: detail.description ?? '',
    discountAmount: String(detail.discountAmount),
    bundleType: detail.bundleType,
    lineCount: toText(detail.lineCount),
    homeProductId: toText(detail.homeProductId),
  }),
  validate,
  toCreateRequest: (values) => ({ code: values.code.trim(), ...toUpdateRequest(values) }),
  toUpdateRequest,
  FormFields: BundleProductFormFields,
}
