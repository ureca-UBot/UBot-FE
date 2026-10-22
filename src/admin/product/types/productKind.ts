import type { ComponentType } from 'react'
import type { AdminProductApi } from '../api/productApi'

export interface ProductFormFieldsProps<TValues> {
  values: TValues
  // 상품 코드는 등록할 때만 입력받습니다.
  isCreate: boolean
  onChange: (patch: Partial<TValues>) => void
}

// 목록 표가 알아야 하는 부분입니다.
export interface ProductKindDisplay<TDetail> {
  label: string
  description: string
  idOf: (detail: TDetail) => number
  codeOf: (detail: TDetail) => string
  nameOf: (detail: TDetail) => string
  // 상품명과 상태 사이에 보여줄 종류별 열입니다.
  columns: { header: string; text: (detail: TDetail) => string }[]
}

export interface ProductRowActionModalProps {
  productId: number
  productName: string
  onClose: () => void
}

// 수정·상태 변경·삭제 외에 그 종류에만 있는 관리 동작입니다. 예: 요금제의 포함 부가서비스
export interface ProductRowAction {
  label: string
  Modal: ComponentType<ProductRowActionModalProps>
}

// 상품 종류 하나의 정의입니다. 목록·표·모달은 모든 종류가 같이 쓰고, 종류마다 다른 부분만 여기에 모읍니다.
export interface ProductKind<TDetail, TValues, TCreate, TUpdate>
  extends ProductKindDisplay<TDetail> {
  rowAction?: ProductRowAction
  api: AdminProductApi<TDetail, TCreate, TUpdate>
  blankValues: TValues
  valuesFrom: (detail: TDetail) => TValues
  // 문제가 있으면 사용자에게 보여줄 문구를, 없으면 null을 돌려줍니다.
  validate: (values: TValues, isCreate: boolean) => string | null
  toCreateRequest: (values: TValues) => TCreate
  toUpdateRequest: (values: TValues) => TUpdate
  FormFields: ComponentType<ProductFormFieldsProps<TValues>>
}
