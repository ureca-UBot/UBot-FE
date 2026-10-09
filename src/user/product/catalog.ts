import type { PageResponse } from '../../shared/types/api'
import { productApi } from './api/productApi'
import type { AddonService, BundleProduct, PlanDetail, PlanSummary, RoamingProduct } from './types/product'
import {
  NETWORK_TYPE_LABELS,
  PLAN_TARGET_GROUP_LABELS,
  formatAgeRange,
  formatDataAmount,
  formatPlanData,
  formatPlanSms,
  formatPlanVoice,
  formatSpeed,
  formatWon,
} from './utils/format'

// 상품 종류마다 응답 모양이 다르므로, 화면은 아래 두 모양(카드·상세)만 알도록 여기서 맞춰 줍니다.
// 목록·상세 컴포넌트는 종류를 구분하지 않습니다.
export interface ProductCard {
  id: number
  badge: string
  name: string
  summary: string | null
  priceLabel: string
  price: string
  specs: string[]
}

export interface ProductDetailView {
  badge: string
  name: string
  description: string | null
  priceLabel: string
  price: string
  rows: { label: string; value: string }[]
}

export interface ProductCatalogQuery {
  keyword: string
  country: string
  page: number
}

export type ProductCatalogKey = 'plans' | 'bundles' | 'addons' | 'roaming'

export interface ProductCatalogKind {
  key: ProductCatalogKey
  label: string
  searchPlaceholder: string
  emptyMessage: string
  // 로밍만 국가로 좁혀 볼 수 있습니다.
  filtersByCountry: boolean
  getCards: (query: ProductCatalogQuery) => Promise<PageResponse<ProductCard>>
  getDetail: (id: number) => Promise<ProductDetailView>
}

const PAGE_SIZE = 12

function mapPage<TItem>(page: PageResponse<TItem>, toCard: (item: TItem) => ProductCard): PageResponse<ProductCard> {
  return { ...page, content: page.content.map(toCard) }
}

function planBadge(plan: PlanSummary) {
  return `${NETWORK_TYPE_LABELS[plan.networkType]} · ${PLAN_TARGET_GROUP_LABELS[plan.targetGroup]}`
}

function planCard(plan: PlanSummary): ProductCard {
  return {
    id: plan.planId,
    badge: planBadge(plan),
    name: plan.name,
    summary: null,
    priceLabel: '월 요금',
    price: formatWon(plan.monthlyFee),
    specs: [`데이터 ${formatPlanData(plan)}`, `음성 ${formatPlanVoice(plan)}`, `문자 ${formatPlanSms(plan)}`],
  }
}

function planDetailView({ summary: plan, description, tetheringAmountMb, minAge, maxAge }: PlanDetail): ProductDetailView {
  const data = plan.exhaustedSpeedKbps === null
    ? formatPlanData(plan)
    : `${formatPlanData(plan)} (소진 후 최대 ${formatSpeed(plan.exhaustedSpeedKbps)})`
  const rows = [
    { label: '데이터', value: data },
    { label: '음성', value: formatPlanVoice(plan) },
    { label: '문자', value: formatPlanSms(plan) },
    { label: '테더링', value: tetheringAmountMb > 0 ? formatDataAmount(tetheringAmountMb) : '제공하지 않음' },
  ]
  const ageRange = formatAgeRange(minAge, maxAge)
  if (ageRange) rows.push({ label: '가입 연령', value: ageRange })

  return {
    badge: planBadge(plan),
    name: plan.name,
    description,
    priceLabel: '월 요금',
    price: formatWon(plan.monthlyFee),
    rows,
  }
}

function bundleView(product: BundleProduct): ProductDetailView {
  return {
    badge: '결합상품',
    name: product.name,
    description: product.description,
    priceLabel: '할인 금액',
    price: formatWon(product.discountAmount),
    rows: [],
  }
}

function addonView(service: AddonService): ProductDetailView {
  return {
    badge: '부가서비스',
    name: service.name,
    description: service.description,
    priceLabel: '월 이용료',
    price: service.monthlyFee === 0 ? '무료' : formatWon(service.monthlyFee),
    rows: [],
  }
}

function roamingView(product: RoamingProduct): ProductDetailView {
  return {
    badge: product.country,
    name: product.name,
    description: product.description,
    priceLabel: '하루 이용료',
    price: formatWon(product.dailyFee),
    rows: [
      { label: '이용 국가', value: product.country },
      { label: '데이터', value: formatDataAmount(product.dataAmountMb) },
    ],
  }
}

// 결합·부가·로밍은 목록과 단건의 모양이 같아서 상세 모양에서 카드를 만듭니다.
function cardFrom(id: number, view: ProductDetailView): ProductCard {
  return {
    id,
    badge: view.badge,
    name: view.name,
    summary: view.description,
    priceLabel: view.priceLabel,
    price: view.price,
    specs: view.rows.filter((row) => row.label !== '이용 국가').map((row) => `${row.label} ${row.value}`),
  }
}

export const productCatalogKinds: ProductCatalogKind[] = [
  {
    key: 'plans',
    label: '요금제',
    searchPlaceholder: '요금제 이름으로 검색',
    emptyMessage: '판매 중인 요금제가 없습니다.',
    filtersByCountry: false,
    getCards: async ({ keyword, page }) =>
      mapPage(await productApi.getPlanList({ keyword, page, size: PAGE_SIZE }), planCard),
    getDetail: async (id) => planDetailView(await productApi.getPlan(id)),
  },
  {
    key: 'bundles',
    label: '결합상품',
    searchPlaceholder: '결합상품 이름으로 검색',
    emptyMessage: '판매 중인 결합상품이 없습니다.',
    filtersByCountry: false,
    getCards: async ({ keyword, page }) =>
      mapPage(
        await productApi.getBundleProductList({ keyword, page, size: PAGE_SIZE }),
        (product) => cardFrom(product.bundleProductId, bundleView(product)),
      ),
    getDetail: async (id) => bundleView(await productApi.getBundleProduct(id)),
  },
  {
    key: 'addons',
    label: '부가서비스',
    searchPlaceholder: '부가서비스 이름으로 검색',
    emptyMessage: '판매 중인 부가서비스가 없습니다.',
    filtersByCountry: false,
    getCards: async ({ keyword, page }) =>
      mapPage(
        await productApi.getAddonServiceList({ keyword, page, size: PAGE_SIZE }),
        (service) => cardFrom(service.addonServiceId, addonView(service)),
      ),
    getDetail: async (id) => addonView(await productApi.getAddonService(id)),
  },
  {
    key: 'roaming',
    label: '로밍',
    searchPlaceholder: '로밍 상품 이름으로 검색',
    emptyMessage: '판매 중인 로밍 상품이 없습니다.',
    filtersByCountry: true,
    getCards: async ({ keyword, country, page }) =>
      mapPage(
        await productApi.getRoamingProductList({ keyword, country, page, size: PAGE_SIZE }),
        (product) => cardFrom(product.roamingProductId, roamingView(product)),
      ),
    getDetail: async (id) => roamingView(await productApi.getRoamingProduct(id)),
  },
]
