import { apiClient } from '../../../shared/api/client'
import type { PlanDetail } from '../../../shared/product/types'
import type { PageResponse } from '../../../shared/types/api'
import type {
  BillingRecord,
  BundleGroup,
  HomeSubscription,
  RoamingScheduleRequest,
  Subscription,
  SubscriptionAddon,
  SubscriptionBundle,
  SubscriptionContract,
  SubscriptionCreateRequest,
  SubscriptionDetail,
  SubscriptionDetailKey,
  SubscriptionRoaming,
  UsageRecord,
  PhoneNumberAvailability,
} from '../types/subscription'

const BASE_PATH = '/api/subscriptions/me'
const HOME_BASE_PATH = '/api/home-subscriptions/me'
// MY 화면에 보여 줄 최근 청구 내역 개수입니다.
const RECENT_BILL_COUNT = 6

// 모든 조회는 로그인한 사용자 본인의 회선만 대상으로 합니다. 다른 사람의 회선 ID를 넣으면 404(SUB-001)입니다.
export const subscriptionApi = {
  checkPhoneNumber: (phoneNumber: string, signal?: AbortSignal) =>
    apiClient.get<PhoneNumberAvailability>(
      `${BASE_PATH}/phone-number-availability?${new URLSearchParams({ phoneNumber })}`,
      { signal },
    ),
  getMySubscriptionList: () => apiClient.get<Subscription[]>(BASE_PATH),
  getMyPlan: (subscriptionId: number) =>
    apiClient.get<PlanDetail>(`${BASE_PATH}/${subscriptionId}/plan`),
  // 현재 약정(ACTIVE)과 만료·해지된 약정까지 모두 내려옵니다. 시작일이 최근인 약정부터 옵니다.
  getMyContractList: (subscriptionId: number) =>
    apiClient.get<SubscriptionContract[]>(`${BASE_PATH}/${subscriptionId}/contracts`),
  getMyBundleList: (subscriptionId: number) =>
    apiClient.get<SubscriptionBundle[]>(`${BASE_PATH}/${subscriptionId}/bundles`),
  getMyAddonList: (subscriptionId: number) =>
    apiClient.get<SubscriptionAddon[]>(`${BASE_PATH}/${subscriptionId}/addons`),
  getMyRoamingList: (subscriptionId: number) =>
    apiClient.get<SubscriptionRoaming[]>(`${BASE_PATH}/${subscriptionId}/roamings`),
  // 사용량과 청구 내역은 최근 달부터 내려옵니다.
  getMyUsageRecordList: (subscriptionId: number, size: number) =>
    apiClient.get<PageResponse<UsageRecord>>(
      `${BASE_PATH}/${subscriptionId}/usage-records?size=${size}`,
    ),
  getMyBillingRecordList: (subscriptionId: number, size: number) =>
    apiClient.get<PageResponse<BillingRecord>>(
      `${BASE_PATH}/${subscriptionId}/billing-records?size=${size}`,
    ),
}

// 개통·해지와 상품 가입·변경입니다. 이용 중(ACTIVE)인 본인 회선에서만 신청할 수 있고(SUB-002),
// 청구 금액(일할 계산)은 바뀌지 않고 가입 기록만 남습니다.
export const subscriptionCommandApi = {
  createSubscription: (body: SubscriptionCreateRequest) =>
    apiClient.post<Subscription>(BASE_PATH, body),
  // 부가서비스·로밍을 취소하고 결합에서 뺍니다. 대표 회선이면 결합 전체가 종료됩니다.
  terminateSubscription: (subscriptionId: number) =>
    apiClient.delete<Subscription>(`${BASE_PATH}/${subscriptionId}`),
  // 한 달에 한 번만 바꿀 수 있습니다(SUB-003). 요금제 포함 부가서비스도 함께 바뀝니다.
  changePlan: (subscriptionId: number, planId: number) =>
    apiClient.patch<PlanDetail>(`${BASE_PATH}/${subscriptionId}/plan`, { planId }),

  subscribeAddon: (subscriptionId: number, addonServiceId: number) =>
    apiClient.post<SubscriptionAddon>(`${BASE_PATH}/${subscriptionId}/addons`, { addonServiceId }),
  // 요금제에 포함된 부가서비스는 해지할 수 없습니다(SUB-016).
  cancelAddon: (subscriptionId: number, subscriptionAddonId: number) =>
    apiClient.delete<SubscriptionAddon>(
      `${BASE_PATH}/${subscriptionId}/addons/${subscriptionAddonId}`,
    ),

  scheduleRoaming: (subscriptionId: number, body: RoamingScheduleRequest) =>
    apiClient.post<SubscriptionRoaming>(`${BASE_PATH}/${subscriptionId}/roamings`, body),
  // 사용 시작 전인 예약만 취소할 수 있습니다(SUB-010).
  cancelRoaming: (subscriptionId: number, subscriptionRoamingId: number) =>
    apiClient.delete<SubscriptionRoaming>(
      `${BASE_PATH}/${subscriptionId}/roamings/${subscriptionRoamingId}`,
    ),

  // 요청한 회선이 대표 회선이 됩니다.
  createBundle: (subscriptionId: number, bundleProductId: number) =>
    apiClient.post<BundleGroup>(`${BASE_PATH}/${subscriptionId}/bundles`, { bundleProductId }),
  // 대표 회선에서만 추가할 수 있고, 본인 명의로 이용 중인 다른 회선만 들어갑니다(SUB-013).
  addBundleMember: (subscriptionId: number, bundleGroupId: number, phoneNumber: string) =>
    apiClient.post<BundleGroup>(
      `${BASE_PATH}/${subscriptionId}/bundle-groups/${bundleGroupId}/members`,
      { phoneNumber },
    ),
  // 대표 회선은 아무 구성 회선이나, 구성 회선은 자기 회선만 뺄 수 있습니다.
  // 대표 회선을 빼면 결합이 종료되고 null이 돌아옵니다.
  removeBundleMember: (
    subscriptionId: number,
    bundleGroupId: number,
    memberSubscriptionId: number,
  ) =>
    apiClient.delete<BundleGroup | null>(
      `${BASE_PATH}/${subscriptionId}/bundle-groups/${bundleGroupId}/members/${memberSubscriptionId}`,
    ),
}

// 인터넷·IPTV 가입입니다. 종류(인터넷·IPTV)마다 하나만 이용할 수 있습니다(HSUB-002).
export const homeSubscriptionApi = {
  getMyHomeSubscriptionList: () => apiClient.get<HomeSubscription[]>(HOME_BASE_PATH),
  subscribe: (homeProductId: number) =>
    apiClient.post<HomeSubscription>(HOME_BASE_PATH, { homeProductId }),
  end: (homeSubscriptionId: number) =>
    apiClient.delete<HomeSubscription>(`${HOME_BASE_PATH}/${homeSubscriptionId}`),
}

// 회선 화면의 항목별 조회입니다. 화면은 항목마다 따로 불러와, 하나가 실패해도 나머지는 그대로 보여 줍니다.
export const subscriptionDetailLoaders: {
  [Key in SubscriptionDetailKey]: (subscriptionId: number) => Promise<SubscriptionDetail[Key]>
} = {
  plan: (subscriptionId) => subscriptionApi.getMyPlan(subscriptionId),
  contracts: (subscriptionId) => subscriptionApi.getMyContractList(subscriptionId),
  bundles: (subscriptionId) => subscriptionApi.getMyBundleList(subscriptionId),
  addons: (subscriptionId) => subscriptionApi.getMyAddonList(subscriptionId),
  roamings: (subscriptionId) => subscriptionApi.getMyRoamingList(subscriptionId),
  usage: async (subscriptionId) =>
    (await subscriptionApi.getMyUsageRecordList(subscriptionId, 1)).content[0] ?? null,
  bills: async (subscriptionId) =>
    (await subscriptionApi.getMyBillingRecordList(subscriptionId, RECENT_BILL_COUNT)).content,
}
