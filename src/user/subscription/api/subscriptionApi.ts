import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { PlanDetail } from '../../product/types/product'
import type {
  BillingRecord,
  Subscription,
  SubscriptionAddon,
  SubscriptionBundle,
  SubscriptionContract,
  SubscriptionDetail,
  SubscriptionDetailKey,
  SubscriptionRoaming,
  UsageRecord,
} from '../types/subscription'

const BASE_PATH = '/api/subscriptions/me'
// MY 화면에 보여 줄 최근 청구 내역 개수입니다.
const RECENT_BILL_COUNT = 6

// 모든 조회는 로그인한 사용자 본인의 회선만 대상으로 합니다. 다른 사람의 회선 ID를 넣으면 404(SUB-001)입니다.
export const subscriptionApi = {
  getMySubscriptionList: () => apiClient.get<Subscription[]>(BASE_PATH),
  getMyPlan: (subscriptionId: number) => apiClient.get<PlanDetail>(`${BASE_PATH}/${subscriptionId}/plan`),
  // 현재 약정이 없으면 data가 null로 내려옵니다.
  getMyContract: (subscriptionId: number) =>
    apiClient.get<SubscriptionContract | null>(`${BASE_PATH}/${subscriptionId}/contract`),
  getMyBundleList: (subscriptionId: number) =>
    apiClient.get<SubscriptionBundle[]>(`${BASE_PATH}/${subscriptionId}/bundles`),
  getMyAddonList: (subscriptionId: number) =>
    apiClient.get<SubscriptionAddon[]>(`${BASE_PATH}/${subscriptionId}/addons`),
  getMyRoamingList: (subscriptionId: number) =>
    apiClient.get<SubscriptionRoaming[]>(`${BASE_PATH}/${subscriptionId}/roamings`),
  // 사용량과 청구 내역은 최근 달부터 내려옵니다.
  getMyUsageRecordList: (subscriptionId: number, size: number) =>
    apiClient.get<PageResponse<UsageRecord>>(`${BASE_PATH}/${subscriptionId}/usage-records?size=${size}`),
  getMyBillingRecordList: (subscriptionId: number, size: number) =>
    apiClient.get<PageResponse<BillingRecord>>(`${BASE_PATH}/${subscriptionId}/billing-records?size=${size}`),
}

// 회선 화면의 항목별 조회입니다. 화면은 항목마다 따로 불러와, 하나가 실패해도 나머지는 그대로 보여 줍니다.
export const subscriptionDetailLoaders: {
  [Key in SubscriptionDetailKey]: (subscriptionId: number) => Promise<SubscriptionDetail[Key]>
} = {
  plan: (subscriptionId) => subscriptionApi.getMyPlan(subscriptionId),
  contract: async (subscriptionId) => (await subscriptionApi.getMyContract(subscriptionId)) ?? null,
  bundles: (subscriptionId) => subscriptionApi.getMyBundleList(subscriptionId),
  addons: (subscriptionId) => subscriptionApi.getMyAddonList(subscriptionId),
  roamings: (subscriptionId) => subscriptionApi.getMyRoamingList(subscriptionId),
  usage: async (subscriptionId) => (await subscriptionApi.getMyUsageRecordList(subscriptionId, 1)).content[0] ?? null,
  bills: async (subscriptionId) =>
    (await subscriptionApi.getMyBillingRecordList(subscriptionId, RECENT_BILL_COUNT)).content,
}
