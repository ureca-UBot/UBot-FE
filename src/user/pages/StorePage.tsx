import { useState } from 'react'
import { productCatalogKinds, type ProductCatalogKey } from '../product/catalog'
import { ProductCatalog } from '../product/components/ProductCatalog'

interface PageProps {
  active: boolean
}

export function StorePage({ active }: PageProps) {
  const [tab, setTab] = useState<ProductCatalogKey>('plans')
  const catalogKind = productCatalogKinds.find((kind) => kind.key === tab)

  return (
    <>
      <section className={`route page-standard${active ? ' active' : ''}`} data-page="store">
        <div className="standard-hero">
          <span>상품 정보</span>
          <h1>
            필요한 통신 상품을
            <br />
            종류별로 찾아보세요.
          </h1>
          <p>요금제, 결합상품, 부가서비스, 로밍 상품을 살펴보세요.</p>
        </div>
        <div className="standard-wrap">
          <div className="store-tabs" role="tablist" aria-label="상품 종류">
            {productCatalogKinds.map((kind) => (
              <button
                aria-selected={tab === kind.key}
                className={tab === kind.key ? 'active' : undefined}
                key={kind.key}
                onClick={() => setTab(kind.key)}
                role="tab"
                type="button"
              >
                {kind.label}
              </button>
            ))}
          </div>

          {/* 스토어 화면이 보일 때만 조회합니다. 모든 화면이 늘 마운트돼 있어서, 조건이 없으면 다른 화면에서도 요청이 나갑니다. */}
          {active && catalogKind && <ProductCatalog key={catalogKind.key} kind={catalogKind} />}
        </div>
      </section>

      {/*PRODUCT DETAIL*/}
    </>
  )
}
