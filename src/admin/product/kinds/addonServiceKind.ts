import { ADDON_CATEGORY_LABELS, formatWon } from '../../../shared/product/format'
import type { AddonService } from '../../../shared/product/types'
import { adminAddonServiceApi } from '../api/productApi'
import { AddonServiceFormFields } from '../components/AddonServiceFormFields'
import type {
  AddonServiceCreateRequest,
  AddonServiceFormValues,
  AddonServiceUpdateRequest,
} from '../types/product'
import type { ProductKind } from '../types/productKind'
import { descriptionOrNull, validateCommonValues } from '../utils/formValues'

function toUpdateRequest(values: AddonServiceFormValues): AddonServiceUpdateRequest {
  return {
    name: values.name.trim(),
    description: descriptionOrNull(values.description),
    monthlyFee: Number(values.monthlyFee),
    category: values.category,
  }
}

export const addonServiceKind: ProductKind<
  AddonService,
  AddonServiceFormValues,
  AddonServiceCreateRequest,
  AddonServiceUpdateRequest
> = {
  label: '부가서비스',
  description: '활성 상태인 부가서비스만 사용자 스토어의 부가서비스 탭에 보입니다.',
  api: adminAddonServiceApi,
  idOf: (detail) => detail.addonServiceId,
  codeOf: (detail) => detail.code,
  nameOf: (detail) => detail.name,
  descriptionOf: (detail) => detail.description,
  columns: [
    { header: '분류', text: (detail) => ADDON_CATEGORY_LABELS[detail.category] },
    { header: '월 이용료', text: (detail) => formatWon(detail.monthlyFee) },
  ],
  blankValues: { code: '', name: '', description: '', monthlyFee: '', category: 'ETC' },
  valuesFrom: (detail) => ({
    code: detail.code,
    name: detail.name,
    description: detail.description ?? '',
    monthlyFee: String(detail.monthlyFee),
    category: detail.category,
  }),
  validate: (values, isCreate) =>
    validateCommonValues(values, isCreate) ??
    (values.monthlyFee === '' ? '월 이용료를 입력해 주세요. 무료면 0을 입력합니다.' : null),
  toCreateRequest: (values) => ({ code: values.code.trim(), ...toUpdateRequest(values) }),
  toUpdateRequest,
  FormFields: AddonServiceFormFields,
}
