import { useState } from 'react'
import { productCatalogKinds, type ProductCatalogKey } from '../product/catalog'
import { ProductCatalog } from '../product/components/ProductCatalog'

interface PageProps {
  active: boolean;
}

type StoreTab = 'phones' | ProductCatalogKey

export function StorePage({ active }: PageProps) {
  const [tab, setTab] = useState<StoreTab>('phones')
  const catalogKind = productCatalogKinds.find((kind) => kind.key === tab)

  return (
    <>
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="store">
      <div className="standard-hero"><span>스토어</span><h1>지금 많이 찾는 휴대폰과<br />요금제를 한 번에 비교하세요.</h1><p>요금제, 결합상품, 부가서비스, 로밍 상품을 살펴보세요.</p></div>
      <div className="standard-wrap">
        <div className="store-tabs" role="tablist" aria-label="상품 종류">
          <button aria-selected={tab === 'phones'} className={tab === 'phones' ? 'active' : undefined} onClick={() => setTab('phones')} role="tab" type="button">휴대폰</button>
          {productCatalogKinds.map((kind) => (
            <button aria-selected={tab === kind.key} className={tab === kind.key ? 'active' : undefined} key={kind.key} onClick={() => setTab(kind.key)} role="tab" type="button">{kind.label}</button>
          ))}
        </div>

        {tab === 'phones' && (
          <>
            {/* 휴대폰(단말) 조회 API는 아직 없어서 이 탭만 고정 데이터입니다. */}
            <p className="store-demo-note">휴대폰은 프로젝트 시연용 상품 데이터입니다.</p>
            <div className="phone-products">
              <article className="phone-product" data-product="Galaxy S26">
                <div className="phone-art galaxy"><i></i><i></i><i></i><span></span></div>
                <div><small>NEW</small><h3>Galaxy S26</h3><p>선명한 카메라와 가벼운 디자인</p><b>월 58,900원부터</b><button className="product-detail">상품 페이지 보기</button></div>
              </article>
              <article className="phone-product" data-product="iPhone 17 Pro">
                <div className="phone-art iphone"><i></i><i></i><i></i><span></span></div>
                <div><small>POPULAR</small><h3>iPhone 17 Pro</h3><p>프로 카메라와 강력한 성능</p><b>월 69,800원부터</b><button className="product-detail">상품 페이지 보기</button></div>
              </article>
              <article className="phone-product" data-product="Galaxy Z Flip7">
                <div className="phone-art flip"><i></i><i></i><span></span></div>
                <div><small>FOLDABLE</small><h3>Galaxy Z Flip7</h3><p>휴대성을 높인 폴더블</p><b>월 62,500원부터</b><button className="product-detail">상품 페이지 보기</button></div>
              </article>
            </div>
          </>
        )}

        {/* 스토어 화면이 보일 때만 조회합니다. 모든 화면이 늘 마운트돼 있어서, 조건이 없으면 다른 화면에서도 요청이 나갑니다. */}
        {active && catalogKind && <ProductCatalog key={catalogKind.key} kind={catalogKind} />}
      </div>
    </section>

    {/*PRODUCT DETAIL*/}
    </>
  );
}
