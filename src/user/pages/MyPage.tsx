interface PageProps {
  active: boolean;
  loggedIn: boolean;
}

export function MyPage({ active, loggedIn }: PageProps) {
  return (
    <>
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="my">
      <div className="standard-hero my-hero"><span>MY</span><h1 id="myHeroTitle">{loggedIn ? <>내 통신 생활,<br />필요한 정보만 한눈에.</> : <>로그인하면 내 통신 생활을<br />한눈에 확인할 수 있어요.</>}</h1><p id="myHeroDesc">요금, 사용량, 결합 정보와 개인 혜택을 확인합니다.</p></div>
      <div className="standard-wrap">
        <div className={`my-guest${loggedIn ? ' hidden' : ''}`} id="myGuest"><h2>현재 비회원입니다.</h2><p>내 정보 조회를 위해 로그인이 필요해요.</p><button className="black-btn open-login">로그인하기</button></div>
        <div className={`my-member${loggedIn ? '' : ' hidden'}`} id="myMember">
          <article className="member-summary"><div><small>010-55••-21••</small><h2>5G 스탠다드</h2><span>9월 청구요금</span><b>54,700원</b></div><div className="usage-circle"><i>54%</i></div></article>
          <div className="my-menu-grid"><button><b>가입 정보</b><span>›</span></button><button><b>요금제 조회·변경</b><span>›</span></button><button><b>납부 방법 변경</b><span>›</span></button><button><b>결합상품 관리</b><span>›</span></button></div>
        </div>
      </div>
    </section>

    {/*BENEFITS*/}
    </>
  );
}
