import plan5g from '../assets/products/plan-5g.jpg'
import planData from '../assets/products/plan-data.jpg'
import planValue from '../assets/products/plan-value.jpg'
import planMobile from '../assets/products/plan-mobile.jpg'
import bundle from '../assets/products/bundle.jpg'
import addon from '../assets/products/addon.jpg'
import roaming from '../assets/products/roaming.jpg'
import home from '../assets/products/home.jpg'
import security from '../assets/products/security.jpg'
import device from '../assets/products/device.jpg'
import voice from '../assets/products/voice.jpg'
import iptv from '../assets/products/iptv.jpg'
import youth from '../assets/products/plan-youth.webp'
import books from '../assets/products/plan-books.webp'
import senior from '../assets/products/plan-senior.webp'
import kids from '../assets/products/plan-kids.webp'
import value from '../assets/products/plan-value.webp'
import data from '../assets/products/plan-data.webp'
import direct from '../assets/products/plan-direct.webp'
import watch from '../assets/products/plan-watch.webp'
import tablet from '../assets/products/plan-tablet.webp'
import coffee from '../assets/products/plan-coffee.webp'
import transit from '../assets/products/plan-transit.webp'
import type { AddonService, PlanSummary } from './types/product'

export const productArtwork = {
  'plan-5g': { src: plan5g, label: '5G 요금제' },
  'plan-data': { src: data, label: '데이터 중심' },
  'plan-value': { src: value, label: '실속 요금제' },
  'plan-mobile': { src: planMobile, label: '모바일 요금제' },
  'plan-youth': { src: youth, label: '청년 요금제' },
  'plan-books': { src: books, label: '북패스 · 독서' },
  'plan-senior': { src: senior, label: '시니어 요금제' },
  'plan-kids': { src: kids, label: '키즈 요금제' },
  'plan-direct': { src: direct, label: '다이렉트 요금제' },
  'plan-watch': { src: watch, label: '워치 요금제' },
  'plan-tablet': { src: tablet, label: '태블릿 요금제' },
  'plan-coffee': { src: coffee, label: '커피 · 라이프' },
  'plan-transit': { src: transit, label: '교통 · 라이프' },
  'plan-music': { src: addon, label: '음악 · 콘텐츠' },
  'plan-shopping': { src: planValue, label: '쇼핑 · 라이프' },
  'plan-security': { src: security, label: '보안 · 안심' },
  bundle: { src: bundle, label: '결합상품' },
  addon: { src: addon, label: '부가서비스' },
  'addon-content': { src: addon, label: '음악 · 콘텐츠' },
  'addon-family': { src: bundle, label: '가족 안심' },
  'addon-data': { src: planData, label: '데이터 충전' },
  'addon-security': { src: security, label: '보안 · 안심' },
  'addon-device': { src: device, label: '디바이스 케어' },
  'addon-voice': { src: voice, label: '통화 서비스' },
  roaming: { src: roaming, label: '해외 로밍' },
  home: { src: home, label: '인터넷' },
  iptv: { src: iptv, label: 'IPTV · 콘텐츠' },
} satisfies Record<string, { src: string; label: string }>

export type ProductArtworkKey = keyof typeof productArtwork

export function addonArtwork(service: AddonService): ProductArtworkKey {
  if (/디바이스|기기|단말/.test(service.name)) return 'addon-device'
  if (/패밀리|가족/.test(service.name)) return 'addon-family'
  if (service.category === 'SAFETY' || service.category === 'BLOCKING') return 'addon-security'
  if (service.category === 'CALL' || service.category === 'VOICE_CHARGE') return 'addon-voice'
  if (service.category === 'DATA_CHARGE') return 'addon-data'
  if (service.category === 'CONTENT') return 'addon-content'
  return 'addon'
}

// 이름을 이미지에 굽지 않아 상품이 추가되거나 이름이 바뀌어도 같은 표지를 재사용합니다.
export function planArtwork(plan: PlanSummary): ProductArtworkKey {
  if (/북패스|독서|전자책/.test(plan.name)) return 'plan-books'
  if (plan.targetGroup === 'SENIOR' || /시니어|실버/.test(plan.name)) return 'plan-senior'
  if (plan.targetGroup === 'KIDS' || /키즈|주니어|어린이/.test(plan.name)) return 'plan-kids'
  if (plan.targetGroup === 'WATCH' || /워치/.test(plan.name)) return 'plan-watch'
  if (plan.targetGroup === 'TABLET' || /태블릿/.test(plan.name)) return 'plan-tablet'
  if (/청년|청소년|대학생/.test(plan.name) || plan.targetGroup === 'YOUTH') return 'plan-youth'
  if (/커피/.test(plan.name)) return 'plan-coffee'
  if (/교통/.test(plan.name)) return 'plan-transit'
  if (/뮤직|음악/.test(plan.name)) return 'plan-music'
  if (/쇼핑/.test(plan.name)) return 'plan-shopping'
  if (/보안|피싱|안심/.test(plan.name)) return 'plan-security'
  if (/다이렉트/.test(plan.name)) return 'plan-direct'
  if (/실속|알뜰|라이트/.test(plan.name)) return 'plan-value'
  if (/프리미엄/.test(plan.name)) return 'plan-5g'
  if (/베이직/.test(plan.name)) return 'plan-mobile'
  if (/밸런스|플러스|데이터|비디오/.test(plan.name)) return 'plan-data'
  if (plan.dataUnlimited || (plan.dataAmountMb ?? 0) >= 50 * 1024) return 'plan-data'
  // 가성비 표지는 월 35,000원 이하 또는 이름에서 실속형임을 명시한 상품에 사용합니다.
  if (plan.monthlyFee <= 35000 || /가성비|실속|알뜰|슬림|라이트|미니/.test(plan.name))
    return 'plan-value'
  return plan.networkType === 'FIVE_G' ? 'plan-5g' : 'plan-mobile'
}
