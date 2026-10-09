import type { PlanDetail } from '../../../user/product/types/product'
import {
  NETWORK_TYPE_LABELS,
  PLAN_TARGET_GROUP_LABELS,
  formatPlanData,
  formatWon,
} from '../../../user/product/utils/format'
import { adminPlanApi } from '../api/productApi'
import { PlanFormFields } from '../components/PlanFormFields'
import type { PlanCreateRequest, PlanFormValues, PlanUpdateRequest } from '../types/product'
import type { ProductKind } from '../types/productKind'
import { descriptionOrNull, toNullableNumber, toText, validateCommonValues } from '../utils/formValues'

// 무제한 여부는 기본값을 두지 않고 관리자가 직접 고르게 합니다(전부 꺼진 상태로 시작).
const blankValues: PlanFormValues = {
  code: '',
  name: '',
  description: '',
  networkType: 'FIVE_G',
  targetGroup: 'GENERAL',
  monthlyFee: '',
  dataUnlimited: false,
  dataAmountMb: '',
  exhaustedSpeedKbps: '',
  voiceUnlimited: false,
  voiceMinutes: '',
  smsUnlimited: false,
  smsCount: '',
  tetheringAmountMb: '0',
  minAge: '',
  maxAge: '',
}

function valuesFrom({ summary: plan, description, tetheringAmountMb, minAge, maxAge }: PlanDetail): PlanFormValues {
  return {
    code: plan.planCode,
    name: plan.name,
    description: description ?? '',
    networkType: plan.networkType,
    targetGroup: plan.targetGroup,
    monthlyFee: String(plan.monthlyFee),
    dataUnlimited: plan.dataUnlimited,
    dataAmountMb: toText(plan.dataAmountMb),
    exhaustedSpeedKbps: toText(plan.exhaustedSpeedKbps),
    voiceUnlimited: plan.voiceUnlimited,
    voiceMinutes: toText(plan.voiceMinutes),
    smsUnlimited: plan.smsUnlimited,
    smsCount: toText(plan.smsCount),
    tetheringAmountMb: String(tetheringAmountMb),
    minAge: toText(minAge),
    maxAge: toText(maxAge),
  }
}

// 백엔드 AdminPlanService.validatePlan과 같은 조합 규칙입니다. 어긋나면 PLAN-003만 돌아와서
// 어느 칸이 문제인지 알 수 없으므로 보내기 전에 칸별 문구로 알려줍니다.
function validate(values: PlanFormValues, isCreate: boolean): string | null {
  const common = validateCommonValues(values, isCreate)
  if (common) return common

  if (values.monthlyFee === '') return '월 요금을 입력해 주세요.'
  if (values.tetheringAmountMb === '') return '테더링 제공량을 입력해 주세요. 제공하지 않으면 0을 입력합니다.'
  if (!values.dataUnlimited && values.dataAmountMb === '') return '데이터 제공량을 입력하거나 데이터 무제한을 선택해 주세요.'
  if (values.exhaustedSpeedKbps !== '' && Number(values.exhaustedSpeedKbps) < 1) {
    return '소진 후 속도는 1Kbps 이상이어야 합니다. 없으면 비워 두세요.'
  }
  if (!values.voiceUnlimited && values.voiceMinutes === '') return '음성 제공량을 입력하거나 음성 무제한을 선택해 주세요.'
  if (!values.smsUnlimited && values.smsCount === '') return '문자 제공량을 입력하거나 문자 무제한을 선택해 주세요.'

  const minAge = toNullableNumber(values.minAge)
  const maxAge = toNullableNumber(values.maxAge)
  if ((minAge !== null && minAge > 120) || (maxAge !== null && maxAge > 120)) return '가입 연령은 0~120 사이로 입력해 주세요.'
  if (minAge !== null && maxAge !== null && minAge > maxAge) return '최소 가입 연령이 최대 가입 연령보다 클 수 없습니다.'
  return null
}

function toUpdateRequest(values: PlanFormValues): PlanUpdateRequest {
  return {
    name: values.name.trim(),
    description: descriptionOrNull(values.description),
    networkType: values.networkType,
    targetGroup: values.targetGroup,
    monthlyFee: Number(values.monthlyFee),
    dataUnlimited: values.dataUnlimited,
    dataAmountMb: values.dataUnlimited ? null : Number(values.dataAmountMb),
    exhaustedSpeedKbps: values.dataUnlimited ? null : toNullableNumber(values.exhaustedSpeedKbps),
    voiceUnlimited: values.voiceUnlimited,
    voiceMinutes: values.voiceUnlimited ? null : Number(values.voiceMinutes),
    smsUnlimited: values.smsUnlimited,
    smsCount: values.smsUnlimited ? null : Number(values.smsCount),
    tetheringAmountMb: Number(values.tetheringAmountMb),
    minAge: toNullableNumber(values.minAge),
    maxAge: toNullableNumber(values.maxAge),
  }
}

export const planKind: ProductKind<PlanDetail, PlanFormValues, PlanCreateRequest, PlanUpdateRequest> = {
  label: '요금제',
  description: '활성 상태인 요금제만 사용자 스토어의 요금제 탭에 보입니다.',
  api: adminPlanApi,
  idOf: (detail) => detail.summary.planId,
  codeOf: (detail) => detail.summary.planCode,
  nameOf: (detail) => detail.summary.name,
  columns: [
    {
      header: '구분',
      text: ({ summary }) => `${NETWORK_TYPE_LABELS[summary.networkType]} · ${PLAN_TARGET_GROUP_LABELS[summary.targetGroup]}`,
    },
    { header: '월 요금', text: ({ summary }) => formatWon(summary.monthlyFee) },
    { header: '데이터', text: ({ summary }) => formatPlanData(summary) },
  ],
  blankValues,
  valuesFrom,
  validate,
  toCreateRequest: (values) => ({ planCode: values.code.trim(), ...toUpdateRequest(values) }),
  toUpdateRequest,
  FormFields: PlanFormFields,
}
