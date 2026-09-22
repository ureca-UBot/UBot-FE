import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface AiMessage {
  id: number;
  role: 'user' | 'ai';
  html: string;
}

interface UseAiDemoOptions {
  loggedIn: boolean;
}

function escapeHtml(
  value: string,
) {
  return value.replace(
    /[&<>"']/g,
    (
      character,
    ) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character]
      ?? character,
  );
}

const wait = (
  milliseconds: number,
) => new Promise<void>(
  (
    resolve,
  ) => {
    window.setTimeout(
      resolve,
      milliseconds,
    );
  },
);

export function useAiDemo({
  loggedIn,
}: UseAiDemoOptions) {
  const [messages, setMessages] =
    useState<AiMessage[]>([]);

  const [
    chatActive,
    setChatActive,
  ] = useState(false);

  const [
    context,
    setContext,
  ] = useState<string[]>([]);

  const [
    faqSatellite,
    setFaqSatellite,
  ] = useState(false);


    const [
        questionCount,
        setQuestionCount,
    ] = useState(1284);

    const [
        cacheHit,
        setCacheHit,
    ] = useState(false);

  const messageId =
    useRef(0);

  const failNext =
    useRef(false);

  const cachePrimed =
    useRef(false);

  const loggedInRef =
    useRef(loggedIn);

  const faqSatelliteRef =
    useRef(false);

  const pendingAfterLogin =
    useRef<string | null>(
      null,
    );

  useEffect(() => {
    loggedInRef.current =
      loggedIn;
  }, [loggedIn]);

  const addMessage =
    useCallback(
      (
        role:
          AiMessage['role'],
        html: string,
      ) => {
        setMessages(
          (
            current,
          ) => [
            ...current,
            {
              id:
                ++messageId.current,
              role,
              html,
            },
          ],
        );
      },
      [],
    );

  const sendAi =
    useCallback(
      async (
        rawQuestion?: string,
        retry = false,
      ) => {
        const question =
          rawQuestion?.trim();

        if (!question) {
          return;
        }

        setQuestionCount(
            (current) => current + 1,
        );

        setChatActive(true);
        setContext([]);

        addMessage(
          'user',
          escapeHtml(
            question,
          ),
        );

        if (
          failNext.current
          && !retry
        ) {
          failNext.current =
            false;

          await wait(420);

          addMessage(
            'ai',
            `<div class="chat-card error-card">
              <div class="chat-card-pad">
                <h4>답변 생성 실패</h4>
                <p>서버 응답이 지연되어 답변을 완료하지 못했어요.</p>
                <div class="answer-actions">
                  <button
                    class="retry-btn"
                    data-retry="${escapeHtml(question)}"
                  >
                    재시도
                  </button>
                </div>
              </div>
            </div>`,
          );

          return;
        }

        await wait(360);

        if (
          /최신\s*폰|최신\s*핸드폰|새로운\s*폰/.test(
            question,
          )
        ) {
          setContext([
            '상품 DB',
            '현재 위치',
            '실시간 인기검색',
          ]);

          addMessage(
            'ai',
            `<div class="answer-text">
              최근 많이 찾는 스마트폰을 기준으로 3가지를 정리했어요.
              상품을 누르면 상세 페이지로 이동할 수 있어요.
            </div>

            <div class="product-list-mini">
              <div class="mini-product">
                <div class="mini-phone"></div>
                <div>
                  <b>Galaxy S26</b>
                  <small>월 58,900원부터</small>
                  <button data-product-link="Galaxy S26">
                    상품 페이지 보기
                  </button>
                </div>
              </div>

              <div class="mini-product">
                <div class="mini-phone"></div>
                <div>
                  <b>iPhone 17 Pro</b>
                  <small>월 69,800원부터</small>
                  <button data-product-link="iPhone 17 Pro">
                    상품 페이지 보기
                  </button>
                </div>
              </div>
            </div>

            <div class="answer-actions">
              <button
                class="primary"
                data-chat-route="support"
              >
                고객지원에서 보기
              </button>

              <button data-reserve>
                방문 예약
              </button>
            </div>`,
          );

          return;
        }

        if (
          /위성\s*인터넷/.test(
            question,
          )
        ) {
          if (
            faqSatelliteRef.current
          ) {
            setContext([
              'FAQ: 인터넷 > 가입/상품',
              'Vector DB 즉시 반영',
            ]);

            addMessage(
              'ai',
              `<div class="answer-text">
                현재 U봇에서는 위성 인터넷 상품을 제공하지 않습니다.
                이용 가능한 인터넷 상품은 지역별 설치 가능 여부를 확인해 주세요.
              </div>

              <div class="chat-card success-card">
                <div class="chat-card-pad">
                  <h4>신규 FAQ 반영 완료</h4>
                  <p>
                    관리자가 등록한 FAQ가 Vector DB 검색 결과에
                    즉시 포함된 시연입니다.
                  </p>
                </div>
              </div>`,
            );
          } else {
            addMessage(
              'ai',
              `<div class="chat-card warning-card">
                <div class="chat-card-pad">
                  <h4>정확한 답변을 찾지 못했습니다.</h4>

                  <p>
                    검색된 FAQ의 유사도가 신뢰도 임계치보다 낮아요.
                    상담원 연결이 필요하신가요?
                  </p>

                  <div class="score-line">
                    <span>최고 유사도 0.41</span>
                    <span>임계치 0.78 미달</span>
                  </div>

                  <div class="answer-actions">
                    <button class="primary">
                      상담원 연결
                    </button>

                    <button data-chat-route="support">
                      고객지원 안내 보기
                    </button>
                  </div>
                </div>
              </div>`,
            );
          }

          return;
        }

        if (
          /나의\s*혜택|내\s*혜택/.test(
            question,
          )
        ) {
          if (
            !loggedInRef.current
          ) {
            pendingAfterLogin.current =
              question;

            addMessage(
              'ai',
              `<div class="chat-card notice-card">
                <div class="chat-card-pad">
                  <h4>로그인이 필요한 질문입니다.</h4>

                  <p>
                    내 요금제와 개인 혜택을 확인하려면 로그인해 주세요.
                    지금까지의 비회원 대화는 그대로 유지됩니다.
                  </p>

                  <button
                    class="primary"
                    data-login-required
                  >
                    로그인하기
                  </button>
                </div>
              </div>`,
            );
          } else {
            setContext([
              '고객 DB',
              '5G 스탠다드',
              '비회원 Thread 승계',
            ]);

            addMessage(
              'ai',
              `<div class="answer-text">
                김유저님은 현재 <b>5G 스탠다드</b>를 이용 중이에요.
                이번 달에는 VIP 영화 할인과 데이터 선물 혜택을 사용할 수 있어요.
              </div>

              <button
                class="primary"
                data-chat-route="benefits"
              >
                혜택 전체 보기
              </button>`,
            );
          }

          return;
        }

        if (
          /결합상품\s*추천|결합\s*추천/.test(
            question,
          )
          && !/으로\s*추천/.test(
            question,
          )
        ) {
          addMessage(
            'ai',
            `<div class="answer-text">
              어떤 결합을 원하시는지 정보가 부족해요.
            </div>

            <div class="quick-choices">
              <button
                class="primary"
                data-choice="인터넷 결합으로 추천해줘"
              >
                인터넷
              </button>

              <button
                data-choice="OTT 결합으로 추천해줘"
              >
                OTT
              </button>

              <button
                data-choice="가족 결합으로 추천해줘"
              >
                가족결합
              </button>
            </div>`,
          );

          return;
        }

        if (
          /인터넷\s*결합으로\s*추천|OTT\s*결합으로\s*추천|가족\s*결합으로\s*추천/.test(
            question,
          )
        ) {
          if (
            !loggedInRef.current
          ) {
            pendingAfterLogin.current =
              question;

            addMessage(
              'ai',
              `<div class="chat-card notice-card">
                <div class="chat-card-pad">
                  <h4>
                    현재 요금제를 확인하려면 로그인이 필요해요.
                  </h4>

                  <button
                    class="primary"
                    data-login-required
                  >
                    로그인하기
                  </button>
                </div>
              </div>`,
            );

            return;
          }

          setContext([
            '현재 요금제 5G 스탠다드',
            '결합상품 DB',
          ]);

          addMessage(
            'ai',
            `<div class="answer-text">
              현재 5G 스탠다드 기준으로 인터넷 결합 3가지를 비교했어요.
            </div>

            <div class="bundle-cards">
              <div class="bundle-card">
                <small>절약형</small>
                <b>500M 인터넷 결합</b>
                <p>월 11,000원 예상 할인</p>
              </div>

              <div class="bundle-card">
                <small>추천</small>
                <b>1G 인터넷 결합</b>
                <p>속도와 할인 균형</p>
              </div>

              <div class="bundle-card">
                <small>가족형</small>
                <b>가족+인터넷 결합</b>
                <p>회선 추가 시 할인 확대</p>
              </div>
            </div>

            <div class="answer-actions">
              <button
                class="primary"
                data-bundle
              >
                결합 변경하기
              </button>
            </div>`,
          );

          return;
        }

        if (
          /5G\s*요금제\s*뭐|5G\s*요금제/.test(
            question,
          )
        ) {
          cachePrimed.current =
            true;

          setContext([
            'Qdrant RAG',
            '응답 1.84s',
          ]);

          addMessage(
            'ai',
            `<div class="answer-text">
              현재 시연용 5G 요금제는
              라이트, 스탠다드, 프리미엄 3가지예요.
            </div>

            <div class="metric-inline">
              <b>1.84s</b>
              <span>RAG 검색 + 생성</span>
            </div>`,
          );

          return;
        }

        if (
          /5G플랜|플랜\s*종류/.test(
            question,
          )
          && cachePrimed.current
        ) {
        setCacheHit(true);

          setContext([
            'Semantic Cache HIT',
            '응답 0.12s',
          ]);

          addMessage(
            'ai',
            `<div class="answer-text">
              5G 플랜은 라이트, 스탠다드, 프리미엄이 있어요.
              앞선 질문과 의미가 유사해 캐시된 답변을 즉시 재사용했어요.
            </div>

            <div class="metric-inline">
              <b>0.12s</b>
              <span>
                최초 생성 1.84s → 캐시 0.12s
              </span>
            </div>`,
          );

          return;
        }

        if (
          /가까운\s*대리점|가까운\s*매장|대리점.*찾/.test(
            question,
          )
        ) {
          setContext([
            '위치 37.50,127.03',
            'PostGIS nearest-store',
          ]);

          addMessage(
            'ai',
            `<div class="answer-text">
              현재 위치 기준으로 가장 가까운 대리점은
              <b>U봇 강남직영점</b>이고
              약 420m 떨어져 있어요.
            </div>

            <button
              class="primary"
              data-reserve
            >
              방문 예약
            </button>

            <button
              data-chat-route="support"
            >
              고객지원 보기
            </button>`,
          );

          return;
        }

        if (
          /인터넷\s*이전|이전\s*설치|이사/.test(
            question,
          )
        ) {
          setContext([
            'FAQ 3건',
          ]);

          addMessage(
            'ai',
            `<div class="answer-text">
              인터넷 이전 설치는 새 주소의 설치 가능 여부를 확인한 뒤
              희망 일정을 선택하면 돼요.
              기존 약정은 이전 설치 후 이어집니다.
            </div>`,
          );

          return;
        }

        addMessage(
          'ai',
          '현재는 시연용 Mock이라 준비된 시나리오에 맞춰 동작해요. 실시간 인기 질문에서 질문을 선택해보세요.',
        );
      },
      [
        addMessage,
      ],
    );

  const resetConversation =
    useCallback(
      () => {
        setMessages([]);
        setContext([]);
        setChatActive(false);
      },
      [],
    );

  const markNextFailure =
    useCallback(
      () => {
        failNext.current =
          true;
      },
      [],
    );

  const registerSatelliteFaq =
    useCallback(
      () => {
        faqSatelliteRef.current =
          true;

        setFaqSatellite(true);
      },
      [],
    );

  const queueAfterLogin =
    useCallback(
      (
        question: string,
      ) => {
        pendingAfterLogin.current =
          question;
      },
      [],
    );

  const takePendingAfterLogin =
    useCallback(
      () => {
        const question =
          pendingAfterLogin.current;

        pendingAfterLogin.current =
          null;

        return question;
      },
      [],
    );

  return {
    messages,
    chatActive,
    context,

    questionCount,
    cacheHit,
    faqSatellite,

    sendAi,
    resetConversation,
    markNextFailure,
    registerSatelliteFaq,
    queueAfterLogin,
    takePendingAfterLogin,
  };
}
