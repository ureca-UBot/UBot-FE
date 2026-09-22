interface PageProps {
  active: boolean;
}

export function BenefitsPage({ active }: PageProps) {
  return (
    <>
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="benefits">
      <div className="standard-hero benefit-hero"><span>혜택</span><h1>매달 받을 수 있는 혜택을<br />놓치지 않도록.</h1><p>로그인 상태에 따라 맞춤 혜택이 표시됩니다.</p></div>
      <div className="standard-wrap benefit-grid">
        <article className="benefit-item pink"><small>멤버십</small><h2>VIP 영화 할인</h2><p>월 1회 영화 할인 혜택</p></article>
        <article className="benefit-item dark"><small>결합</small><h2>가족 결합 추가 할인</h2><p>가족 회선과 인터넷을 함께</p></article>
        <article className="benefit-item cream"><small>데이터</small><h2>데이터 선물</h2><p>남는 데이터를 가족에게</p></article>
      </div>
    </section>

    {/*NETWORK*/}
    </>
  );
}
