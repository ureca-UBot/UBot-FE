import { HOME_PRODUCT_TYPE_LABELS, formatMbps, formatWon } from '../../../shared/product/format'
import type { HomeProduct } from '../../../shared/product/types'
import { adminHomeProductApi } from '../api/productApi'
import { HomeProductFormFields } from '../components/HomeProductFormFields'
import type {
  HomeProductCreateRequest,
  HomeProductFormValues,
  HomeProductUpdateRequest,
} from '../types/product'
import type { ProductKind } from '../types/productKind'
import {
  descriptionOrNull,
  toNullableNumber,
  toText,
  validateCommonValues,
} from '../utils/formValues'

// 백엔드 AdminHomeProductService.validateSpeed와 같은 규칙입니다. 어긋나면 HOME-003만 돌아옵니다.
function validate(values: HomeProductFormValues, isCreate: boolean): string | null {
  const common = validateCommonValues(values, isCreate)
  if (common) return common
  if (values.monthlyFee === '') return '월 요금을 입력해 주세요.'
  if (
    values.productType === 'INTERNET' &&
    (values.speedMbps === '' || Number(values.speedMbps) < 1)
  )
    return '인터넷 상품은 최대 속도를 1Mbps 이상으로 입력해 주세요.'
  return null
}

function toUpdateRequest(values: HomeProductFormValues): HomeProductUpdateRequest {
  return {
    name: values.name.trim(),
    description: descriptionOrNull(values.description),
    speedMbps: values.productType === 'INTERNET' ? toNullableNumber(values.speedMbps) : null,
    monthlyFee: Number(values.monthlyFee),
  }
}

export const homeProductKind: ProductKind<
  HomeProduct,
  HomeProductFormValues,
  HomeProductCreateRequest,
  HomeProductUpdateRequest
> = {
  label: '인터넷/IPTV',
  description: '활성 상태인 인터넷·IPTV 상품만 사용자 스토어의 인터넷/IPTV 탭에 보입니다.',
  api: adminHomeProductApi,
  idOf: (detail) => detail.homeProductId,
  codeOf: (detail) => detail.code,
  nameOf: (detail) => detail.name,
  descriptionOf: (detail) => detail.description,
  columns: [
    { header: '종류', text: (detail) => HOME_PRODUCT_TYPE_LABELS[detail.productType] },
    {
      header: '최대 속도',
      text: (detail) => (detail.speedMbps === null ? '-' : formatMbps(detail.speedMbps)),
    },
    { header: '월 요금', text: (detail) => formatWon(detail.monthlyFee) },
  ],
  blankValues: {
    code: '',
    name: '',
    description: '',
    productType: 'INTERNET',
    speedMbps: '',
    monthlyFee: '',
  },
  valuesFrom: (detail) => ({
    code: detail.code,
    name: detail.name,
    description: detail.description ?? '',
    productType: detail.productType,
    speedMbps: toText(detail.speedMbps),
    monthlyFee: String(detail.monthlyFee),
  }),
  validate,
  toCreateRequest: (values) => ({
    code: values.code.trim(),
    productType: values.productType,
    ...toUpdateRequest(values),
  }),
  toUpdateRequest,
  FormFields: HomeProductFormFields,
}
