import type { RoamingProduct } from '../../../user/product/types/product'
import { formatDataAmount, formatWon } from '../../../user/product/utils/format'
import { adminRoamingProductApi } from '../api/productApi'
import { RoamingProductFormFields } from '../components/RoamingProductFormFields'
import type {
  RoamingProductCreateRequest,
  RoamingProductFormValues,
  RoamingProductUpdateRequest,
} from '../types/product'
import type { ProductKind } from '../types/productKind'
import { descriptionOrNull, validateCommonValues } from '../utils/formValues'

function validate(values: RoamingProductFormValues, isCreate: boolean): string | null {
  const common = validateCommonValues(values, isCreate)
  if (common) return common
  if (!values.country.trim()) return '이용 국가를 입력해 주세요.'
  if (values.dailyFee === '') return '하루 이용료를 입력해 주세요.'
  if (values.dataAmountMb === '') return '데이터 제공량을 입력해 주세요.'
  return null
}

function toUpdateRequest(values: RoamingProductFormValues): RoamingProductUpdateRequest {
  return {
    name: values.name.trim(),
    description: descriptionOrNull(values.description),
    dailyFee: Number(values.dailyFee),
    dataAmountMb: Number(values.dataAmountMb),
    country: values.country.trim(),
  }
}

export const roamingProductKind: ProductKind<
  RoamingProduct,
  RoamingProductFormValues,
  RoamingProductCreateRequest,
  RoamingProductUpdateRequest
> = {
  label: '로밍 상품',
  description: '활성 상태인 로밍 상품만 사용자 스토어의 로밍 탭에 보입니다.',
  api: adminRoamingProductApi,
  idOf: (detail) => detail.roamingProductId,
  codeOf: (detail) => detail.code,
  nameOf: (detail) => detail.name,
  columns: [
    { header: '이용 국가', text: (detail) => detail.country },
    { header: '하루 이용료', text: (detail) => formatWon(detail.dailyFee) },
    { header: '데이터', text: (detail) => formatDataAmount(detail.dataAmountMb) },
  ],
  blankValues: { code: '', name: '', description: '', dailyFee: '', dataAmountMb: '', country: '' },
  valuesFrom: (detail) => ({
    code: detail.code,
    name: detail.name,
    description: detail.description ?? '',
    dailyFee: String(detail.dailyFee),
    dataAmountMb: String(detail.dataAmountMb),
    country: detail.country,
  }),
  validate,
  toCreateRequest: (values) => ({ code: values.code.trim(), ...toUpdateRequest(values) }),
  toUpdateRequest,
  FormFields: RoamingProductFormFields,
}
