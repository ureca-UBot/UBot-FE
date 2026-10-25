import stores from '../assets/page-heroes/stores.webp'
import products from '../assets/page-heroes/products.webp'
import notices from '../assets/page-heroes/notices.webp'
import customer from '../assets/page-heroes/customer.webp'
import myDevice from '../assets/page-heroes/banner-my-objects.webp'

export const pageHeroArtwork = {
  stores,
  products,
  notices,
  customer,
  my: myDevice,
}

export type PageHeroKind = keyof typeof pageHeroArtwork
