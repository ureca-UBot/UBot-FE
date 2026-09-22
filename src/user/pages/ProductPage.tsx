interface PageProps {
  active: boolean;
  productTitle: string;
}

export function ProductPage({ active, productTitle }: PageProps) {
  return (
    <>
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="product">
      <div className="product-detail-wrap">
        <button className="back-link" data-route="store">← 스토어</button>
        <div className="product-detail-grid">
          <div className="product-hero-art"><div className="phone-art detail-phone galaxy"><i></i><i></i><i></i><span></span></div></div>
          <div className="product-copy">
            <span className="product-label">NEW · 시연용 상품</span><h1 id="productTitle">{productTitle}</h1><p>일상에서 편하게 쓰는 최신 스마트폰을 가정한 프로젝트용 상품 상세 화면입니다.</p>
            <div className="product-price"><small>예상 월 납부금</small><b>58,900원부터</b></div>
            <div className="option-box"><span>색상</span><div><button className="swatch s-black"></button><button className="swatch s-pink"></button><button className="swatch s-silver"></button></div></div>
            <button className="black-btn wide">온라인 주문</button><button className="outline-wide" data-route="stores">매장에서 상담하기</button>
          </div>
        </div>
      </div>
    </section>

    {/*MY*/}
    </>
  );
}
