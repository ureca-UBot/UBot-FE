import type { NetworkType, PlanTargetGroup } from '../../../user/product/types/product'
import { NETWORK_TYPE_LABELS, PLAN_TARGET_GROUP_LABELS } from '../../../user/product/utils/format'
import type { PlanFormValues } from '../types/product'
import type { ProductFormFieldsProps } from '../types/productKind'
import { ProductCommonFields } from './ProductCommonFields'
import { ProductNumberField } from './ProductNumberField'

const NETWORK_TYPES = Object.keys(NETWORK_TYPE_LABELS) as NetworkType[]
const TARGET_GROUPS = Object.keys(PLAN_TARGET_GROUP_LABELS) as PlanTargetGroup[]

export function PlanFormFields({ values, isCreate, onChange }: ProductFormFieldsProps<PlanFormValues>) {
  return (
    <>
      <ProductCommonFields isCreate={isCreate} onChange={onChange} values={values} />

      <label>
        통신 방식
        <select onChange={(event) => onChange({ networkType: event.target.value as NetworkType })} value={values.networkType}>
          {NETWORK_TYPES.map((type) => <option key={type} value={type}>{NETWORK_TYPE_LABELS[type]}</option>)}
        </select>
      </label>

      <label>
        대상
        <select onChange={(event) => onChange({ targetGroup: event.target.value as PlanTargetGroup })} value={values.targetGroup}>
          {TARGET_GROUPS.map((group) => <option key={group} value={group}>{PLAN_TARGET_GROUP_LABELS[group]}</option>)}
        </select>
      </label>

      <ProductNumberField label="월 요금 (원)" onChange={(monthlyFee) => onChange({ monthlyFee })} value={values.monthlyFee} />

      <ProductNumberField
        hint="제공하지 않으면 0을 입력합니다."
        label="테더링 제공량 (MB)"
        maxLength={12}
        onChange={(tetheringAmountMb) => onChange({ tetheringAmountMb })}
        value={values.tetheringAmountMb}
      />

      {/* 무제한을 켜면 해당 제공량을 비우고 잠급니다. 값이 남은 채로 보내면 백엔드가 거절합니다. */}
      <fieldset className="admin-product-options admin-product-form__full">
        <legend>무제한 제공</legend>
        <label>
          <input
            checked={values.dataUnlimited}
            onChange={(event) => onChange(event.target.checked
              ? { dataUnlimited: true, dataAmountMb: '', exhaustedSpeedKbps: '' }
              : { dataUnlimited: false })}
            type="checkbox"
          />
          데이터 무제한
        </label>
        <label>
          <input
            checked={values.voiceUnlimited}
            onChange={(event) => onChange(event.target.checked
              ? { voiceUnlimited: true, voiceMinutes: '' }
              : { voiceUnlimited: false })}
            type="checkbox"
          />
          음성 무제한
        </label>
        <label>
          <input
            checked={values.smsUnlimited}
            onChange={(event) => onChange(event.target.checked
              ? { smsUnlimited: true, smsCount: '' }
              : { smsUnlimited: false })}
            type="checkbox"
          />
          문자 무제한
        </label>
      </fieldset>

      <ProductNumberField
        disabled={values.dataUnlimited}
        hint="1GB = 1024MB"
        label="데이터 제공량 (MB)"
        maxLength={12}
        onChange={(dataAmountMb) => onChange({ dataAmountMb })}
        placeholder={values.dataUnlimited ? '무제한' : undefined}
        value={values.dataAmountMb}
      />

      <ProductNumberField
        disabled={values.dataUnlimited}
        hint="제공량을 다 쓴 뒤의 속도입니다. 없으면 비워 둡니다."
        label="소진 후 속도 (Kbps)"
        onChange={(exhaustedSpeedKbps) => onChange({ exhaustedSpeedKbps })}
        placeholder={values.dataUnlimited ? '무제한' : undefined}
        value={values.exhaustedSpeedKbps}
      />

      <ProductNumberField
        disabled={values.voiceUnlimited}
        label="음성 제공량 (분)"
        onChange={(voiceMinutes) => onChange({ voiceMinutes })}
        placeholder={values.voiceUnlimited ? '무제한' : undefined}
        value={values.voiceMinutes}
      />

      <ProductNumberField
        disabled={values.smsUnlimited}
        label="문자 제공량 (건)"
        onChange={(smsCount) => onChange({ smsCount })}
        placeholder={values.smsUnlimited ? '무제한' : undefined}
        value={values.smsCount}
      />

      <ProductNumberField
        label="최소 가입 연령"
        maxLength={3}
        onChange={(minAge) => onChange({ minAge })}
        placeholder="제한 없음"
        value={values.minAge}
      />

      <ProductNumberField
        label="최대 가입 연령"
        maxLength={3}
        onChange={(maxAge) => onChange({ maxAge })}
        placeholder="제한 없음"
        value={values.maxAge}
      />
    </>
  )
}
