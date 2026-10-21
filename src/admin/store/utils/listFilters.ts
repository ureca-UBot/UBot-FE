export const serviceFilters = [
  ['IDENTITY_THEFT_REPORT', '명의도용 접수'],
  ['APPLE_AS', '애플 A/S'],
  ['FOREIGN_LANGUAGE_SUPPORT', '외국어 지원'],
] as const

export type StoreListMode = 'active' | 'deleted'
