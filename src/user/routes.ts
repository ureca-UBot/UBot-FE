export type UserPage = 'store' | 'my' | 'stores' | 'notices' | 'ai' | 'customer'

export const userPageTitles: Record<UserPage, string> = {
  store: '상품 정보',
  my: '내 정보',
  stores: '매장 정보',
  notices: '공지/장애 안내',
  ai: 'AI 채팅',
  customer: '고객센터',
}

const routePaths: Record<UserPage, string> = {
  store: 'store',
  my: 'my',
  stores: 'stores',
  notices: 'notices',
  ai: 'ai',
  customer: 'customer-center',
}

const pathAliases: Record<string, UserPage> = {
  '': 'ai',
  store: 'store',
  products: 'store',
  'store/product': 'store',
  my: 'my',
  benefit: 'store',
  benefits: 'store',
  network: 'notices',
  support: 'notices',
  stores: 'stores',
  'support/store-address': 'stores',
  notices: 'notices',
  ai: 'ai',
  'customer-center': 'customer',
}

const appBase = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')

export function pageFromLocation(): UserPage {
  const hashPath = window.location.hash.replace(/^#\/?/, '').split('?')[0].replace(/\/+$/g, '')

  return pathAliases[hashPath] ?? 'ai'
}

export function pageUrl(page: UserPage) {
  const path = routePaths[page]

  return path ? `${appBase}#/${path}` : `${appBase}#/`
}

export function isUserPage(value: string | undefined): value is UserPage {
  return Boolean(value && value in userPageTitles)
}
export function userPageFromPath(pathname: string): UserPage {
  return pathAliases[pathname.replace(/^\//, '').replace(/\/+$/, '')] ?? 'ai'
}

export function userPagePath(page: UserPage): string {
  return page === 'ai' ? '/' : '/' + routePaths[page]
}
