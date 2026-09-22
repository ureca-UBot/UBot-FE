export type UserPage =
  | 'home'
  | 'store'
  | 'product'
  | 'my'
  | 'benefits'
  | 'support'
  | 'ai'

export const userPageTitles: Record<UserPage, string> = {
  home: 'U봇',
  store: '스토어',
  product: '상품 상세',
  my: 'MY',
  benefits: '혜택',
  support: '고객지원',
  ai: 'AI 검색',
}

const routePaths: Record<UserPage, string> = {
  home: '',
  store: 'store',
  product: 'store/product',
  my: 'my',
  benefits: 'benefits',
  support: 'support',
  ai: 'ai',
}

const pathAliases: Record<string, UserPage> = {
  '': 'home',
  store: 'store',
  'store/product': 'product',
  my: 'my',
  benefit: 'benefits',
  benefits: 'benefits',
  network: 'support',
  support: 'support',
  ai: 'ai',
}

const appBase = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')

export function pageFromLocation(): UserPage {
  let path = window.location.pathname

  if (appBase !== '/' && path.startsWith(appBase)) {
    path = path.slice(appBase.length)
  } else {
    path = path.replace(/^\/+/, '')
  }

  return pathAliases[path.replace(/\/+$/g, '')] ?? 'home'
}

export function pageUrl(page: UserPage) {
  const path = routePaths[page]
  return path ? `${appBase}${path}` : appBase
}

export function isUserPage(value: string | undefined): value is UserPage {
  return Boolean(value && value in userPageTitles)
}
