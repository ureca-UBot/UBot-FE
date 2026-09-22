interface PageProps {
  active: boolean;
}

export function SupportPage({ active }: PageProps) {
  return (
    <>
    <section className={`route page-standard${active ? ' active' : ''}`} data-page="support">
      <div className="standard-hero network-hero"><span>통신 상태</span><h1>내 주변의 통신 불편,<br />흩어진 제보를 하나의 신호로.</h1><p>유사 제보 증가와 운영자가 확인한 장애를 구분해서 보여줍니다.</p></div>
      <div className="standard-wrap network-detail">
        <div className="network-map-large">
          <div className="map-filter"><button className="active">데이터</button><button>통화</button><button>문자</button><select><option>최근 15분</option><option>최근 1시간</option></select></div>
          <div className="big-map-art"><span className="grid"></span><b className="area a1">논현동</b><b className="area a2">역삼동</b><b className="area a3">삼성동</b><button className="bubble-dot b1">3</button><button className="bubble-dot b2">8</button><button className="bubble-dot b3">2</button></div>
        </div>
        <aside className="network-detail-card"><span className="orange-state">● 유사 제보 증가</span><h2>역삼동</h2><p>모바일 데이터 연결 문제</p><strong>8 <small>건</small></strong><em>최근 15분 · 직전 구간 대비 +6</em><div className="warning-copy"><b>아직 장애로 확인된 상황은 아니에요.</b><p>동일 지역에서 유사 증상 제보가 증가해 운영자 확인 후보로 표시됐습니다.</p></div><button id="reportOpen">나도 같은 증상 제보하기</button></aside>
      </div>
    </section>

    {/*STORES*/}
    </>
  );
}
