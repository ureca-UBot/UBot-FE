import type { PageResponse } from '../../shared/types/api'
import { productApi } from './api/productApi'
import type {
  AddonCategory,
  AddonService,
  BundleProduct,
  BundleType,
  HomeProduct,
  HomeProductType,
  PlanDetail,
  PlanSummary,
  RoamingProduct,
} from './types/product'
import {
  ADDON_CATEGORY_LABELS,
  BUNDLE_TYPE_LABELS,
  HOME_PRODUCT_TYPE_LABELS,
  NETWORK_TYPE_LABELS,
  PLAN_TARGET_GROUP_LABELS,
  formatAgeRange,
  formatDataAmount,
  formatLineCount,
  formatMbps,
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
  // 종류별 분류 필터(결합 종류·부가서비스 분류·인터넷/IPTV)에서 고른 값입니다. 빈 문자열이면 전체입니다.
  option: string
  page: number
}

// 검색창 옆에 두는 분류 선택입니다.
export interface ProductCatalogFilter {
  label: string
  allLabel: string
  options: { value: string; label: string }[]
}

export type ProductCatalogKey = 'plans' | 'bundles' | 'addons' | 'roaming' | 'home'

export interface ProductCatalogKind {
  key: ProductCatalogKey
  label: string
  searchPlaceholder: string
  emptyMessage: string
  // 로밍만 국가로 좁혀 볼 수 있습니다.
  filtersByCountry: boolean
  filter?: ProductCatalogFilter
  getCards: (query: ProductCatalogQuery) => Promise<PageResponse<ProductCard>>
  getDetail: (id: number) => Promise<ProductDetailView>
}

const PAGE_SIZE = 12

function mapPage<TItem>(
  page: PageResponse<TItem>,
  toCard: (item: TItem) => ProductCard,
): PageResponse<ProductCard> {
  return { ...page, content: page.content.map(toCard) }
}

function filterOptions<TValue extends string>(labels: Record<TValue, string>) {
  return (Object.keys(labels) as TValue[]).map((value) => ({ value, label: labels[value] }))
}

// 고를 수 있는 값만 넘깁니다. 빈 문자열(전체)은 조건 없이 조회합니다.
function optionOrUndefined<TValue extends string>(option: string, labels: Record<TValue, string>) {
  return option in labels ? (option as TValue) : undefined
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
    specs: [
      `데이터 ${formatPlanData(plan)}`,
      `음성 ${formatPlanVoice(plan)}`,
      `문자 ${formatPlanSms(plan)}`,
    ],
  }
}

function planDetailView(
  { summary: plan, description, tetheringAmountMb, minAge, maxAge }: PlanDetail,
  includedAddons: AddonService[],
): ProductDetailView {
  const data =
    plan.exhaustedSpeedKbps === null
      ? formatPlanData(plan)
      : `${formatPlanData(plan)} (소진 후 최대 ${formatSpeed(plan.exhaustedSpeedKbps)})`
  const rows = [
    { label: '데이터', value: data },
    { label: '음성', value: formatPlanVoice(plan) },
    { label: '문자', value: formatPlanSms(plan) },
    {
      label: '테더링',
      value: tetheringAmountMb > 0 ? formatDataAmount(tetheringAmountMb) : '제공하지 않음',
    },
  ]
  const ageRange = formatAgeRange(minAge, maxAge)
  if (ageRange) rows.push({ label: '가입 연령', value: ageRange })
  if (includedAddons.length > 0)
    rows.push({
      label: '기본 제공',
      value: includedAddons.map((addon) => addon.name).join(', '),
    })

  return {
    badge: planBadge(plan),
    name: plan.name,
    description,
    priceLabel: '월 요금',
    price: formatWon(plan.monthlyFee),
    rows,
  }
}

// 홈 결합의 인터넷 상품은 상세에서만 따로 조회해 붙입니다. 목록에서는 회선 수만 보여 줍니다.
function bundleView(
  product: BundleProduct,
  homeProduct: HomeProduct | null = null,
): ProductDetailView {
  const rows = [{ label: '회선 수', value: formatLineCount(product.lineCount) }]
  if (homeProduct) rows.push({ label: '필요 인터넷', value: homeProductName(homeProduct) })
  return {
    badge: BUNDLE_TYPE_LABELS[product.bundleType],
    name: product.name,
    description: product.description,
    priceLabel: '할인 금액',
    price: formatWon(product.discountAmount),
    rows,
  }
}

function addonView(service: AddonService): ProductDetailView {
  return {
    badge: ADDON_CATEGORY_LABELS[service.category],
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

function homeProductName(product: HomeProduct) {
  return product.speedMbps === null
    ? product.name
    : `${product.name} (최대 ${formatMbps(product.speedMbps)})`
}

function homeView(product: HomeProduct): ProductDetailView {
  return {
    badge: HOME_PRODUCT_TYPE_LABELS[product.productType],
    name: product.name,
    description: product.description,
    priceLabel: '월 요금',
    price: formatWon(product.monthlyFee),
    rows:
      product.speedMbps === null
        ? []
        : [{ label: '최대 속도', value: formatMbps(product.speedMbps) }],
  }
}

// 결합·부가·로밍·인터넷은 목록과 단건의 모양이 같아서 상세 모양에서 카드를 만듭니다.
function cardFrom(id: number, view: ProductDetailView): ProductCard {
  return {
    id,
    badge: view.badge,
    name: view.name,
    summary: view.description,
    priceLabel: view.priceLabel,
    price: view.price,
    specs: view.rows
      .filter((row) => row.label !== '이용 국가')
      .map((row) => `${row.label} ${row.value}`),
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
    // 포함 부가서비스를 못 받아도 요금제 상세는 보여 줍니다.
    getDetail: async (id) => {
      const [plan, includedAddons] = await Promise.all([
        productApi.getPlan(id),
        productApi.getPlanIncludedAddonList(id).catch(() => []),
      ])
      return planDetailView(plan, includedAddons)
    },
  },
  {
    key: 'bundles',
    label: '결합상품',
    searchPlaceholder: '결합상품 이름으로 검색',
    emptyMessage: '판매 중인 결합상품이 없습니다.',
    filtersByCountry: false,
    filter: {
      label: '결합 종류',
      allLabel: '전체 결합',
      options: filterOptions(BUNDLE_TYPE_LABELS),
    },
    getCards: async ({ keyword, option, page }) =>
      mapPage(
        await productApi.getBundleProductList({
          keyword,
          bundleType: optionOrUndefined<BundleType>(option, BUNDLE_TYPE_LABELS),
          page,
          size: PAGE_SIZE,
        }),
        (product) => cardFrom(product.bundleProductId, bundleView(product)),
      ),
    getDetail: async (id) => {
      const product = await productApi.getBundleProduct(id)
      // 연결된 인터넷이 판매 중지되었으면 조회가 실패하므로 그 줄만 뺍니다.
      const homeProduct =
        product.homeProductId === null
          ? null
          : await productApi.getHomeProduct(product.homeProductId).catch(() => null)
      return bundleView(product, homeProduct)
    },
  },
  {
    key: 'addons',
    label: '부가서비스',
    searchPlaceholder: '부가서비스 이름으로 검색',
    emptyMessage: '판매 중인 부가서비스가 없습니다.',
    filtersByCountry: false,
    filter: {
      label: '부가서비스 분류',
      allLabel: '전체 분류',
      options: filterOptions(ADDON_CATEGORY_LABELS),
    },
    getCards: async ({ keyword, option, page }) =>
      mapPage(
        await productApi.getAddonServiceList({
          keyword,
          category: optionOrUndefined<AddonCategory>(option, ADDON_CATEGORY_LABELS),
          page,
          size: PAGE_SIZE,
        }),
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
  {
    key: 'home',
    label: '인터넷/IPTV',
    searchPlaceholder: '인터넷·IPTV 상품 이름으로 검색',
    emptyMessage: '판매 중인 인터넷·IPTV 상품이 없습니다.',
    filtersByCountry: false,
    filter: {
      label: '상품 종류',
      allLabel: '인터넷·IPTV 전체',
      options: filterOptions(HOME_PRODUCT_TYPE_LABELS),
    },
    getCards: async ({ keyword, option, page }) =>
      mapPage(
        await productApi.getHomeProductList({
          keyword,
          productType: optionOrUndefined<HomeProductType>(option, HOME_PRODUCT_TYPE_LABELS),
          page,
          size: PAGE_SIZE,
        }),
        (product) => cardFrom(product.homeProductId, homeView(product)),
      ),
    getDetail: async (id) => homeView(await productApi.getHomeProduct(id)),
  },
]
