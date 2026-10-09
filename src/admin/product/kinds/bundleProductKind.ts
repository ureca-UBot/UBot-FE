import type { BundleProduct } from '../../../user/product/types/product'
import { formatWon } from '../../../user/product/utils/format'
import { adminBundleProductApi } from '../api/productApi'
import { BundleProductFormFields } from '../components/BundleProductFormFields'
import type {
  BundleProductCreateRequest,
  BundleProductFormValues,
  BundleProductUpdateRequest,
} from '../types/product'
import type { ProductKind } from '../types/productKind'
import { descriptionOrNull, validateCommonValues } from '../utils/formValues'

function toUpdateRequest(values: BundleProductFormValues): BundleProductUpdateRequest {
  return {
    name: values.name.trim(),
    description: descriptionOrNull(values.description),
    discountAmount: Number(values.discountAmount),
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
  columns: [{ header: '할인 금액', text: (detail) => formatWon(detail.discountAmount) }],
  blankValues: { code: '', name: '', description: '', discountAmount: '' },
  valuesFrom: (detail) => ({
    code: detail.code,
    name: detail.name,
    description: detail.description ?? '',
    discountAmount: String(detail.discountAmount),
  }),
  validate: (values, isCreate) =>
    validateCommonValues(values, isCreate) ?? (values.discountAmount === '' ? '할인 금액을 입력해 주세요.' : null),
  toCreateRequest: (values) => ({ code: values.code.trim(), ...toUpdateRequest(values) }),
  toUpdateRequest,
  FormFields: BundleProductFormFields,
}
