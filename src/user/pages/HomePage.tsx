import { LogoutButton } from '../../auth/components/LogoutButton';

interface PageProps {
  active: boolean;
  heroIndex: number;
  loggedIn: boolean;
  /** 실제 로그인한 사용자 이름. 있으면 모바일 인사말에 표시하고 누르면 MY로 이동합니다. */
  memberName: string | null;
}

export function HomePage({ active, heroIndex, loggedIn, memberName }: PageProps) {
  return (
    <>
    <section className={`route${active ? ' active' : ''}`} data-page="home">
      <section
          className="desktop-only editorial-hero hero-carousel"
          data-current={heroIndex}
          aria-roledescription="carousel"
          aria-label="U봇 주요 서비스"
        >
        <div className="hero-stage">
          <article className={`hero-slide hero-slide-life${heroIndex === 0 ? ' active' : ''}`} data-hero-slide="0" aria-hidden={heroIndex !== 0}>
            <div className="hero-inner">
              <div className="hero-copy">
                <span className="hero-kicker">통신이 쉬워지는 새로운 방법</span>
                <h1>복잡한 통신 생활을<br /><em>한눈에, 가볍게.</em></h1>
                <p>상품을 찾고, 혜택을 확인하고, 문제가 생기면 해결까지.<br />U봇은 필요한 순간에 다음 행동을 바로 이어줍니다.</p>
                <div className="hero-actions">
                  <button className="black-btn" data-route="my">내 서비스 보기</button>
                  <button className="link-btn" data-route="ai">궁금한 내용 검색 <span>↗</span></button>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <span className="hero-visual-badge hvb-life"><i></i> U봇 서비스 연결 중</span>
                <div className="pink-orbit"></div>
                <div className="phone phone-back">
                  <div className="screen">
                    <div className="screen-logo"><img src={logo} alt="" /><b>U봇</b></div>
                    <span className="screen-caption">9월 청구요금</span>
                    <b className="screen-price">54,700원</b>
                    <div className="usage-line"><span style={{ width: '54%' }}></span></div>
                    <div className="screen-menu"><i>요금</i><i>데이터</i><i>혜택</i></div>
                  </div>
                </div>
                <div className="phone phone-front">
                  <div className="screen">
                    <span className="screen-caption">우리 동네 통신 상태</span>
                    <b className="screen-title">역삼동 유사 제보 증가</b>
                    <div className="signal-art"><i></i><i></i><i></i><strong>8</strong></div>
                    <small className="screen-note">최근 15분 · 데이터 연결 관련</small>
                  </div>
                </div>
                <span className="float-note n1">데이터 18.6GB 남음</span>
                <span className="float-note n2">가까운 매장 420m</span>
              </div>
            </div>
          </article>

          <article className={`hero-slide hero-slide-store${heroIndex === 1 ? ' active' : ''}`} data-hero-slide="1" aria-hidden={heroIndex !== 1}>
            <div className="hero-inner">
              <div className="hero-copy">
                <span className="hero-kicker">LOCATION · POSTGIS</span>
                <h1>가까운 매장을<br /><em>지금 위치에서 바로.</em></h1>
                <p>현재 위치를 기준으로 가까운 LG U+ 매장을 찾고,<br />거리와 매장 정보를 한 화면에서 확인할 수 있어요.</p>
                <div className="hero-actions">
                  <button className="black-btn" data-route="stores">가까운 매장 찾기</button>
                  <button className="link-btn" data-route="ai" data-ai-prompt="가까운 대리점을 찾고 싶어">AI에게 물어보기 <span>↗</span></button>
                </div>
              </div>
              <div className="hero-location-art" aria-hidden="true">
                <span className="hero-visual-badge hvb-store"><i></i> 위치 기반 매장 검색</span>
                <div className="location-map-card">
                  <div className="map-road road-a"></div><div className="map-road road-b"></div><div className="map-road road-c"></div>
                  <span className="map-label ml1">강남대로</span><span className="map-label ml2">테헤란로</span>
                  <i className="hero-map-pin hp1">1</i><i className="hero-map-pin hp2">2</i><i className="hero-map-pin hp3">3</i>
                  <span className="hero-current-pos">현재 위치</span>
                  <svg className="route-line" viewBox="0 0 500 390" preserveAspectRatio="none" aria-hidden="true"><path d="M290 300 C260 260 280 220 236 196 C200 176 170 148 157 112" /></svg>
                </div>
                <div className="nearest-store-card">
                  <small>가장 가까운 매장</small><strong>U봇 강남직영점</strong><span>420m · 상담 · 개통 · 기기변경</span>
                  <div><b>영업 중</b><em>도보 약 6분</em></div>
                </div>
                <span className="location-chip lc1">PostGIS</span><span className="location-chip lc2">1,686개 매장</span>
              </div>
            </div>
          </article>

          <article className={`hero-slide hero-slide-ai${heroIndex === 2 ? ' active' : ''}`} data-hero-slide="2" aria-hidden={heroIndex !== 2}>
            <div className="hero-inner">
              <div className="hero-copy">
                <span className="hero-kicker">AI SEARCH · RAG</span>
                <h1>궁금한 건 묻고,<br /><em>다음 행동까지 바로.</em></h1>
                <p>FAQ 검색부터 상품·혜택·매장 안내까지 이어서 답하고,<br />찾지 못한 질문은 운영 데이터로 다시 연결합니다.</p>
                <div className="hero-actions">
                  <button className="black-btn" data-route="ai">AI 검색 시작하기</button>
                  <button className="link-btn" data-route="ai" data-ai-prompt="최신 폰 어떤게 있어?">인기 질문 체험 <span>↗</span></button>
                </div>
              </div>
              <div className="hero-ai-art" aria-hidden="true">
                <span className="hero-visual-badge hvb-ai"><i></i> RAG · 실시간 응답</span>
                <div className="ai-orb"></div>
                <div className="ai-demo-window">
                  <div className="ai-demo-top"><span><i></i><i></i><i></i></span><b>U봇 AI</b><em>RAG ONLINE</em></div>
                  <div className="ai-demo-body">
                    <p className="ai-user-bubble">최신 폰 어떤 게 있어?</p>
                    <div className="ai-answer-bubble"><span className="mini-ai-mark">AI</span><p>최근 많이 찾는 스마트폰과<br />가까운 매장을 함께 찾았어요.</p></div>
                    <div className="ai-result-row"><span>Galaxy S26</span><b>상품 DB</b></div>
                    <div className="ai-result-row"><span>강남직영점 · 420m</span><b>PostGIS</b></div>
                  </div>
                </div>
                <span className="ai-float af1">Vector DB 검색</span><span className="ai-float af2">Semantic Cache</span>
              </div>
            </div>
          </article>
        </div>

        <div className="hero-carousel-controls" aria-label="배너 탐색">
          <div className="hero-pagination">
            <button className={`hero-dot${heroIndex === 0 ? ' active' : ''}`} data-hero-go="0" aria-label="첫 번째 배너" aria-current={heroIndex === 0 ? 'true' : undefined}><span></span><em>01</em></button>
            <button className={`hero-dot${heroIndex === 1 ? ' active' : ''}`} data-hero-go="1" aria-label="두 번째 배너" aria-current={heroIndex === 1 ? 'true' : undefined}><span></span><em>02</em></button>
            <button className={`hero-dot${heroIndex === 2 ? ' active' : ''}`} data-hero-go="2" aria-label="세 번째 배너" aria-current={heroIndex === 2 ? 'true' : undefined}><span></span><em>03</em></button>
          </div>
          <div className="hero-arrow-buttons"><button className="hero-prev" aria-label="이전 배너">←</button><button className="hero-next" aria-label="다음 배너">→</button></div>
        </div>
      </section>

      <section className="desktop-only home-quick-services reveal-on-scroll" aria-label="자주 찾는 서비스">
        <div className="home-quick-inner">
          <div className="home-quick-lead">
            <span>QUICK SERVICE</span>
            <strong>필요한 순간,<br />바로 이어서.</strong>
          </div>
          <div className="home-quick-grid">
            <button data-route="ai">
              <i>01</i><span><b>AI로 묻기</b><small>FAQ부터 상품·혜택까지</small></span><em>↗</em>
            </button>
            <button data-route="stores">
              <i>02</i><span><b>가까운 매장</b><small>현재 위치 기준으로 찾기</small></span><em>↗</em>
            </button>
            <button data-route="support">
              <i>03</i><span><b>통신 상태</b><small>우리 동네 현황 확인</small></span><em>↗</em>
            </button>
            <button data-route="benefits">
              <i>04</i><span><b>나의 혜택</b><small>멤버십·결합 혜택 모아보기</small></span><em>↗</em>
            </button>
          </div>
        </div>
      </section>

      <section className="mobile-only mobile-home">
        <div className="mobile-welcome"><small id="mobileWelcomeSmall">{memberName ? <><button className="mobile-member-link" data-route="my" type="button">안녕하세요, <b>{memberName}</b>님 ›</button><LogoutButton className="mobile-logout-link" redirectTo={null} /></> :loggedIn ? '안녕하세요, 김유저님' : '로그인하지 않아도 기본 서비스를 이용할 수 있어요.'}</small><h1>필요한 통신 서비스를<br />빠르게 찾아보세요.</h1></div>

        <article className={`mobile-guest-card${loggedIn || memberName ? ' hidden' : ''}`} id="mobileGuestCard">
          <div><span>비회원 이용 중</span><b>내 요금·혜택을 보려면 로그인하세요.</b></div><button className="open-login">로그인</button>
        </article>

        <div className="mobile-shortcuts">
          <button data-route="store"><span>▦</span><b>휴대폰</b></button>
          <button data-route="benefits"><span>◇</span><b>혜택</b></button>
          <button data-route="support"><span>◉</span><b>통신 상태</b></button>
          <button data-route="stores"><span>⌖</span><b>매장 찾기</b></button>
        </div>

        <article className="mobile-feature" data-route="ai">
          <div><span>실시간 인기 질문</span><h2>최신 폰 어떤 게 있어?</h2><p>최근 질문이 빠르게 늘고 있어요.</p></div>
          <div className="trend-arrow">↗</div>
        </article>

        <article className="mobile-network" data-route="support">
          <div><span>우리 동네 통신 상태</span><h2>역삼동에서 유사 제보가 늘고 있어요</h2><p>최근 15분 · 데이터 연결 관련 8건</p></div>
          <div className="mini-signal"><i></i><i></i><i></i><b>8</b></div>
        </article>

        <section className="mobile-section">
          <div className="mobile-section-title"><h2>자주 찾는 서비스</h2><button>전체</button></div>
          <div className="mobile-list">
            <button data-route="ai" data-ai-prompt="인터넷 이전 설치 어떻게 해?"><span className="list-icon coral">⌂</span><span><b>인터넷 이전 설치</b><small>이사 전에 미리 신청해보세요</small></span><em>›</em></button>
            <button data-route="stores"><span className="list-icon violet">⌖</span><span><b>가까운 대리점 찾기</b><small>현재 위치 기준으로 찾아요</small></span><em>›</em></button>
            <button data-route="ai"><span className="list-icon grey">?</span><span><b>궁금한 내용 검색</b><small>FAQ부터 신청 방법까지</small></span><em>›</em></button>
          </div>
        </section>
      </section>

      <section className="desktop-only intro-block">
        <span className="section-kicker">U봇 LIFE</span>
        <h2>필요한 정보를 찾고,<br />그 다음 행동까지 자연스럽게.</h2>
        <p>검색 결과를 보여주는 데서 멈추지 않고 상품 조회, 매장 예약,<br />로그인 후 개인 혜택 확인까지 하나의 흐름으로 연결합니다.</p>
      </section>

      <section className="desktop-only story story-light">
        <div className="story-inner">
          <div className="story-text">
            <span className="story-num">01</span><h2>지금 많이 묻는 질문을<br />먼저 보여드려요</h2>
            <p>비회원도 최근 급증한 질문을 바로 확인할 수 있고,<br />답변 안에서 상품 페이지와 가까운 대리점까지 이어집니다.</p>
            <button className="text-link" data-route="ai" data-ai-prompt="최신 폰 어떤게 있어?">실시간 인기 질문 보기 →</button>
          </div>
          <div className="story-visual trend-visual">
            <div className="search-panel">
              <div className="search-panel-head"><small>실시간 인기 질문</small><span>최근 30분</span></div>
              <button data-route="ai" data-ai-prompt="최신 폰 어떤게 있어?"><em>1</em><b>최신 폰 어떤게 있어?</b><i>↗ 38%</i></button>
              <button data-route="ai" data-ai-prompt="5G 요금제 뭐 있어요?"><em>2</em><b>5G 요금제 뭐 있어요?</b><i>↗ 22%</i></button>
              <button data-route="ai" data-ai-prompt="인터넷 이전 설치 어떻게 해?"><em>3</em><b>인터넷 이전 설치 어떻게 해?</b><i>↗ 17%</i></button>
              <button data-route="ai" data-ai-prompt="가까운 대리점을 찾고 싶어"><em>4</em><b>가까운 대리점을 찾고 싶어</b><i>↗ 9%</i></button>
            </div>
          </div>
        </div>
      </section>

      <section className="desktop-only story story-pink">
        <div className="story-inner reverse">
          <div className="story-text">
            <span className="story-num">02</span><h2>답을 모르면 모른다고,<br />그리고 운영으로 다시 연결</h2>
            <p>FAQ에 없는 질문은 신뢰도 임계치를 넘지 못하면 상담원 연결을 안내하고,<br />미응답 로그에 저장해 관리자가 새 FAQ로 보완할 수 있습니다.</p>
            <button className="white-link" data-route="ai" data-ai-prompt="위성 인터넷 서비스도 되나요?">미응답 처리 시연 →</button>
          </div>
          <div className="story-visual unresolved-visual">
            <div className="unresolved-card"><span>미응답 질문</span><b>“위성 인터넷 서비스도 되나요?”</b><small>검색 최고 유사도 0.41 · 임계치 0.78 미달</small><hr /><em>관리자 FAQ 등록 대기</em></div>
          </div>
        </div>
      </section>

      <section className="desktop-only story story-cream">
        <div className="story-inner">
          <div className="story-text">
            <span className="story-num">03</span><h2>로그인 전 대화도<br />끊기지 않게 이어서</h2>
            <p>비회원 상담 맥락을 세션에 남기고, 로그인 이후 같은 대화로 돌아와<br />개인 요금제와 혜택 정보를 연결해 안내합니다.</p>
            <button className="text-link" data-route="ai" data-ai-prompt="나의 혜택 알려줘">로그인 승계 흐름 보기 →</button>
          </div>
          <div className="story-visual continuity-visual">
            <div className="thread-card"><span>비회원</span><p>최신 폰 어떤게 있어?</p><i></i><span>로그인 완료</span><p>나의 혜택 알려줘</p><strong>같은 대화 Thread 유지</strong></div>
          </div>
        </div>
      </section>
    </section>

    {/*STORE*/}
    </>
  );
}

import logo from '../assets/ubot-logo.png'
