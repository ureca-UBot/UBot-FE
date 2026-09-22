import logo from '../assets/ubot-logo.png'
import type { UserPage } from '../routes'

interface DesktopHeaderProps {
  loggedIn: boolean;
  scrolled: boolean;
  page: UserPage
}

export function DesktopHeader({ loggedIn, scrolled, page }: DesktopHeaderProps) {
  return (
    <>
  <header className={`desktop-header${scrolled ? ' scrolled' : ''}`}>
    <div className="utility">
      <div className="utility-inner">
        <div className="utility-left">
          <button className="utility-brand" data-route="home" aria-label="U봇 홈"><img src={logo} alt="U봇" /></button>
        </div>
        <div className="utility-right">
          <button className="on" data-route="home">개인</button><button data-route="support">고객지원</button><button id="demoOpen">시연</button>
        </div>
      </div>
    </div>
    <div className="global-nav">
      <nav className="gnb" aria-label="주요 메뉴">
        <div className="gnb-item">
          <button className={page === 'store' || page === 'product' ? 'active' : ''} data-route="store" aria-haspopup="true">스토어</button>
          <div className="mega-menu">
            <div className="mega-menu-inner mega-menu-grid">
              <section className="mega-column"><strong>모바일 기기</strong><button data-route="store">휴대폰</button><button data-route="store">태블릿</button><button data-route="store">스마트워치</button><button data-route="store">액세서리</button></section>
              <section className="mega-column"><strong>요금제</strong><button data-route="store">전체 요금제</button><button data-route="store">온라인 요금제</button><button data-route="store">데이터 요금제</button><button data-route="store">요금제 비교</button></section>
              <section className="mega-column"><strong>인터넷 · IPTV</strong><button data-route="store">인터넷 / IPTV</button><button data-route="store">인터넷 요금제</button><button data-route="store">IPTV 요금제</button><button data-route="benefits">결합 할인</button></section>
              <section className="mega-column"><strong>매장 · 가입</strong><button data-route="support">가까운 매장</button><button data-route="support">매장 검색</button><button data-route="ai" data-ai-prompt="가입 상담을 받고 싶어">가입 상담</button><button data-route="benefits">이달의 혜택</button></section>
              <section className="mega-column mega-column-ai"><strong>AI 추천 <em>βeta</em></strong><button data-route="ai" data-ai-prompt="나한테 맞는 휴대폰 추천해줘">휴대폰 추천</button><button data-route="ai" data-ai-prompt="나한테 맞는 요금제 추천해줘">요금제 추천</button><button data-route="ai">AI에게 물어보기</button></section>
            </div>
          </div>
        </div>
        <div className="gnb-item">
          <button className={page === 'my' ? 'active' : ''} data-route="my" aria-haspopup="true">MY</button>
          <div className="mega-menu">
            <div className="mega-menu-inner mega-menu-grid">
              <section className="mega-column"><strong>나의 가입 정보</strong><button data-route="my">가입 정보 확인</button><button data-route="my">이용 중인 상품</button><button data-route="my">약정 · 할부 정보</button></section>
              <section className="mega-column"><strong>사용 현황</strong><button data-route="my">데이터 사용량</button><button data-route="my">월별 이용 내역</button><button data-route="support">우리 동네 통신 상태</button></section>
              <section className="mega-column"><strong>나의 혜택</strong><button data-route="benefits">멤버십 혜택</button><button data-route="benefits">결합 할인</button><button data-route="benefits">진행 중인 이벤트</button></section>
              <section className="mega-column"><strong>계정 · 설정</strong><button data-route="my">회원 정보</button><button data-route="my">알림 설정</button><button data-route="ai">도움말 검색</button></section>
              <section className="mega-column mega-column-ai"><strong>AI 도우미 <em>βeta</em></strong><button data-route="ai" data-ai-prompt="내 데이터 사용량 알려줘">사용량 물어보기</button><button data-route="ai" data-ai-prompt="나의 혜택 알려줘">내 혜택 찾기</button></section>
            </div>
          </div>
        </div>
        <div className="gnb-item">
          <button className={page === 'benefits' ? 'active' : ''} data-route="benefits" aria-haspopup="true">혜택</button>
          <div className="mega-menu">
            <div className="mega-menu-inner mega-menu-grid">
              <section className="mega-column"><strong>멤버십</strong><button data-route="benefits">멤버십 혜택</button><button data-route="benefits">제휴 혜택</button><button data-route="benefits">등급별 혜택</button></section>
              <section className="mega-column"><strong>결합 할인</strong><button data-route="benefits">가족 결합</button><button data-route="benefits">인터넷 결합</button><button data-route="benefits">결합 할인 비교</button></section>
              <section className="mega-column"><strong>이벤트</strong><button data-route="benefits">진행 중인 이벤트</button><button data-route="benefits">신규 가입 혜택</button><button data-route="benefits">기기 구매 혜택</button></section>
              <section className="mega-column"><strong>추천 혜택</strong><button data-route="benefits">인기 혜택</button><button data-route="benefits">내게 맞는 혜택</button><button data-route="benefits">혜택 모아보기</button></section>
              <section className="mega-column mega-column-ai"><strong>AI 혜택 찾기 <em>βeta</em></strong><button data-route="ai" data-ai-prompt="나의 혜택 알려줘">내 혜택 추천</button><button data-route="ai" data-ai-prompt="지금 받을 수 있는 할인 알려줘">할인 찾아보기</button></section>
            </div>
          </div>
        </div>
        <div className="gnb-item">
          <button className={page === 'support' ? 'active' : ''} data-route="support" aria-haspopup="true">고객지원</button>
          <div className="mega-menu">
            <div className="mega-menu-inner mega-menu-grid">
              <section className="mega-column"><strong>서비스 확인</strong><button data-route="support">통신 상태 확인</button><button data-route="support">장애 · 점검 안내</button><button data-route="support">서비스 지역 확인</button></section>
              <section className="mega-column"><strong>매장 안내</strong><button data-route="support">가까운 매장 찾기</button><button data-route="support">지역별 매장 검색</button><button data-route="support">매장 상세 정보</button></section>
              <section className="mega-column"><strong>자주 찾는 도움말</strong><button data-route="ai" data-ai-prompt="인터넷 이전 설치 어떻게 해?">이전 설치</button><button data-route="ai">가입 · 변경 문의</button><button data-route="ai">요금 · 납부 문의</button></section>
              <section className="mega-column"><strong>상담</strong><button data-route="ai">AI 고객지원</button><button data-route="support">매장 상담</button><button data-route="my">내 문의 확인</button></section>
              <section className="mega-column mega-column-ai"><strong>AI 고객지원 <em>βeta</em></strong><button data-route="ai">질문 바로 입력</button><button data-route="ai" data-ai-prompt="가까운 대리점을 찾고 싶어">가까운 매장 물어보기</button></section>
            </div>
          </div>
        </div>
        <div className="gnb-item gnb-ai-item"><button className={page === 'ai' ? 'active' : ''} data-route="ai">AI 검색 <em>βeta</em></button></div>
      </nav>
      <div className="header-tools" aria-label="빠른 메뉴">
        <button className="header-action" aria-label="전체메뉴"><span className="header-action-icon" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12H31 M9 20H31 M9 28H31" stroke="#222" strokeWidth="2" strokeLinecap="round"/></svg></span><span className="header-action-label">전체메뉴</span></button>
        <button className="header-action" data-route="support" aria-label="매장찾기"><span className="header-action-icon" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 35 C20 35 30 26 30 17.5 C30 12 25.5 8 20 8 C14.5 8 10 12 10 17.5 C10 26 20 35 20 35Z" stroke="#222" strokeWidth="2" strokeLinejoin="round"/><path d="M15 17H25 L24 14H16 L15 17Z" stroke="#222" strokeWidth="1.7" strokeLinejoin="round"/><path d="M16 17V23H24V17" stroke="#222" strokeWidth="1.7" strokeLinejoin="round"/><path d="M19 23V20H21V23" stroke="#222" strokeWidth="1.7" strokeLinejoin="round"/></svg></span><span className="header-action-label">매장찾기</span></button>
        <button className="header-action search-open" data-route="ai" aria-label="검색"><span className="header-action-icon" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="8" stroke="#222" strokeWidth="2"/><path d="M24 24L31 31" stroke="#222" strokeWidth="2" strokeLinecap="round"/></svg></span><span className="header-action-label">검색</span></button>
        <button className="header-action header-cart" aria-label="장바구니"><span className="header-action-icon" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 15H29L28 31H12L11 15Z" stroke="#222" strokeWidth="2" strokeLinejoin="round"/><path d="M16 16V13 C16 10.2 17.8 9 20 9 C22.2 9 24 10.2 24 13 V16" stroke="#222" strokeWidth="2" strokeLinecap="round"/></svg></span><span className="header-action-label">장바구니</span></button>
        <button className="header-action open-login" aria-label="로그인"><span className="header-action-icon" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="13" r="5.5" stroke="#222" strokeWidth="2"/><path d="M10 31 C10 25.5 14.5 22 20 22 C25.5 22 30 25.5 30 31" stroke="#222" strokeWidth="2" strokeLinecap="round"/></svg></span><span className="header-action-label" id="desktopLoginText">{loggedIn ? '김유저님' : '로그인'}</span></button>
      </div>
    </div>
    <div className="mega-backdrop" aria-hidden="true"></div>
  </header>
    </>
  );
}
