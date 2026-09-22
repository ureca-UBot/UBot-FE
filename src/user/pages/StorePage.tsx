interface PageProps {
  active: boolean;
}

export function StorePage({ active }: PageProps) {
  return (
    <>
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="store">
      <div className="standard-hero"><span>스토어</span><h1>지금 많이 찾는 휴대폰과<br />요금제를 한 번에 비교하세요.</h1><p>프로젝트 시연용 상품 데이터입니다.</p></div>
      <div className="standard-wrap">
        <div className="store-tabs"><button className="active">휴대폰</button><button>요금제</button><button>인터넷/IPTV</button></div>
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
      </div>
    </section>

    {/*PRODUCT DETAIL*/}
    </>
  );
}
