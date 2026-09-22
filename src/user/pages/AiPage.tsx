export interface AiMessage {
  id: number;
  role: 'user' | 'ai';
  html: string;
}

interface PageProps {
  active: boolean;
  loggedIn: boolean;
  chatActive: boolean;
  messages: AiMessage[];
  context: string[];
}

export function AiPage({ active, loggedIn, chatActive, messages, context }: PageProps) {
  return (
    <>
    <section className={`route ai-route${active ? ' active' : ''}`} data-page="ai">
      <div className="ai-app">
        <div className="ai-app-head">
          <div><strong>AI 검색</strong><span>βeta</span></div>
          <div className={`ai-session-state${loggedIn ? ' member' : ''}`}><i></i><b id="aiSessionLabel">{loggedIn ? '김유저님 · 로그인 세션' : '비회원 세션'}</b></div>
        </div>

        <div className="ai-layout">
          <aside className="ai-left desktop-only">
            <button className="new-chat" id="newChat">＋ 새 대화</button>
            <div className="history-block"><small>최근 대화</small><button className="active"><span>최신 폰 어떤게 있어?</span><em>방금</em></button><button><span>인터넷 이전 설치</span><em>어제</em></button></div>
            <div className="ai-left-bottom"><button className="open-login">로그인</button><button data-route="home">서비스 홈</button></div>
          </aside>

          <section className="ai-center">
            <div className={`ai-home-view${chatActive ? ' hidden' : ''}`} id="aiHomeView">
              <div className="ai-greeting"><small>AI 검색</small><h1>무엇을 찾고 계세요?</h1><p>상품, 요금제, 혜택, 매장, 고객지원 정보를 대화하듯 찾아보세요.</p></div>
              <div className="ai-searchbox large"><textarea id="aiHeroInput" rows={1} placeholder="궁금한 내용을 입력해 주세요." aria-label="AI 검색어"></textarea><button className="voice" aria-label="음성 입력">◉</button><button className="send-ai" aria-label="질문 보내기">↑</button></div>
              <div className="trending-panel">
                <div className="trending-head"><div><span className="live-dot"></span><b>실시간 인기 질문</b></div><small>최근 30분</small></div>
                <button data-ai-q="최신 폰 어떤게 있어?"><em>1</em><span>최신 폰 어떤게 있어?</span><i>↗ 38%</i></button>
                <button data-ai-q="5G 요금제 뭐 있어요?"><em>2</em><span>5G 요금제 뭐 있어요?</span><i>↗ 22%</i></button>
                <button data-ai-q="인터넷 이전 설치 어떻게 해?"><em>3</em><span>인터넷 이전 설치 어떻게 해?</span><i>↗ 17%</i></button>
                <button data-ai-q="가까운 대리점을 찾고 싶어"><em>4</em><span>가까운 대리점을 찾고 싶어</span><i>↗ 9%</i></button>
              </div>
            </div>

            <div className={`ai-chat-view${chatActive ? '' : ' hidden'}`} id="aiChatView">
              <div className="chat-thread" id="chatThread">
                {messages.map((message) => (
                  <div className={`msg ${message.role}`} key={message.id}>
                    {message.role === 'ai' && <div className="msg-avatar">AI</div>}
                    <div className="msg-body" dangerouslySetInnerHTML={{ __html: message.html }} />
                  </div>
                ))}
              </div>
              <div className="chat-bottom">
                <div className="context-strip" id="contextStrip">{context.map((item) => <span key={item}>{item}</span>)}</div>
                <div className="ai-searchbox"><textarea id="aiChatInput" rows={1} placeholder="궁금한 내용을 입력해 주세요." aria-label="AI 검색어"></textarea><button className="voice" aria-label="음성 입력">◉</button><button className="send-ai" aria-label="질문 보내기">↑</button></div>
                <small className="ai-disclaimer">답변은 FAQ, 상품·가입 정보, 운영 데이터 기반의 시연용 Mock입니다.</small>
              </div>
            </div>
          </section>

          <aside className="ai-right desktop-only">
            <div className="side-context-card"><small>현재 상태</small><b id="rightLoginState">{loggedIn ? '로그인 완료' : '비회원'}</b><p id="rightLoginDesc">{loggedIn ? '개인 요금제와 혜택 조회가 가능해요.' : '개인 정보 조회 질문은 로그인 후 이용할 수 있어요.'}</p><button className="open-login">로그인하기</button></div>
            <div className="side-context-card"><small>가까운 대리점</small><b>U봇 강남직영점</b><p>현재 위치 기준 420m</p><button data-route="support">고객지원에서 보기</button></div>
            <div className="side-context-card muted"><small>대화 세션</small><b id="threadState">{loggedIn ? 'MEMBER-SESSION' : 'GUEST-8F21'}</b><p>로그인 전후 같은 Thread를 유지합니다.</p></div>
          </aside>
        </div>
      </div>
    </section>

    {/*ADMIN*/}
    </>
  );
}
