import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { productCatalogKinds, type ProductCatalogKey } from '../product/catalog'
import { ProductCatalog } from '../product/components/ProductCatalog'
import { ProductDetailDialog } from '../product/components/ProductDetailDialog'
import { PageHero } from '../components/PageHero'

interface PageProps {
  active: boolean
}

export function StorePage({ active }: PageProps) {
  const [savedTab, setTab] = useState<ProductCatalogKey>('plans')
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('category')
  const tab = productCatalogKinds.some((kind) => kind.key === requested)
    ? (requested as ProductCatalogKey)
    : savedTab
  const catalogKind = productCatalogKinds.find((kind) => kind.key === tab)
  const productId = Number(searchParams.get('productId'))
  const hasLinkedProduct = active && Number.isSafeInteger(productId) && productId > 0
  const option = catalogKind?.filter?.options.some(
    (item) => item.value === searchParams.get('option'),
  )
    ? (searchParams.get('option') ?? '')
    : ''

  return (
    <>
      <section className={`route page-standard${active ? ' active' : ''}`} data-page="store">
        <PageHero
          image="products"
          eyebrow="상품 정보"
          description="요금제, 결합상품, 부가서비스, 로밍, 인터넷·IPTV 상품을 살펴보세요."
        >
          필요한 통신 상품을
          <br />
          종류별로 찾아보세요.
        </PageHero>
        <div className="standard-wrap">
          <div className="store-tabs" role="tablist" aria-label="상품 종류">
            {productCatalogKinds.map((kind) => (
              <button
                aria-selected={tab === kind.key}
                className={tab === kind.key ? 'active' : undefined}
                key={kind.key}
                onClick={() => {
                  setTab(kind.key)
                  setSearchParams({ category: kind.key })
                }}
                role="tab"
                type="button"
              >
                {kind.label}
              </button>
            ))}
          </div>

          {/* 첫 방문까지의 마운트는 VisitedPage가 제어함. 메뉴를 오갈 때는 검색값을 유지함 */}
          {catalogKind && (
            <ProductCatalog
              key={`${catalogKind.key}:${option}`}
              kind={catalogKind}
              initialOption={option}
            />
          )}
        </div>
      </section>

      {catalogKind && hasLinkedProduct && (
        <ProductDetailDialog
          key={`${catalogKind.key}:${productId}`}
          kind={catalogKind}
          productId={productId}
          onClose={() =>
            setSearchParams(
              (current) => {
                const next = new URLSearchParams(current)
                next.delete('productId')
                return next
              },
              { replace: true },
            )
          }
        />
      )}
    </>
  )
}
