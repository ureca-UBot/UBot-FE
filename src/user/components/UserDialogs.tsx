import { useEffect, useRef } from 'react'

export type UserDialog = 'reserve' | 'bundle' | 'demo' | null

interface UserDialogsProps {
  activeDialog: UserDialog
  onClose: () => void
}

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [onClose])

  return ref
}

export function UserDialogs({ activeDialog, onClose }: UserDialogsProps) {
  const reserveRef = useDialog(activeDialog === 'reserve', onClose)
  const bundleRef = useDialog(activeDialog === 'bundle', onClose)
  const demoRef = useDialog(activeDialog === 'demo', onClose)

  return (
    <>
      <dialog className="modal" ref={reserveRef}>
        <form method="dialog">
          <div className="modal-head">
            <div><small>방문 예약</small><h3>U봇 강남직영점</h3></div>
            <button value="cancel" aria-label="닫기">×</button>
          </div>
          <label><span>방문 날짜</span><input type="date" defaultValue="2026-09-24" /></label>
          <label><span>방문 시간</span><select defaultValue="14:00"><option>14:00</option><option>15:00</option><option>16:00</option></select></label>
          <label><span>상담 업무</span><select defaultValue="휴대폰 구매 상담"><option>휴대폰 구매 상담</option><option>요금제 변경</option><option>기기변경</option></select></label>
          <button id="reserveSubmit" className="black-btn modal-full" value="default">예약 완료</button>
        </form>
      </dialog>

      <dialog className="modal" ref={bundleRef}>
        <form method="dialog">
          <div className="modal-head">
            <div><small>결합 변경</small><h3>인터넷 결합으로 변경할까요?</h3></div>
            <button value="cancel" aria-label="닫기">×</button>
          </div>
          <div className="bundle-preview"><span>현재</span><b>5G 스탠다드</b><i>＋</i><span>추가</span><b>기가 인터넷 500M</b><p>시연용 예상 할인: 월 11,000원</p></div>
          <button id="bundleSubmit" className="black-btn modal-full" value="default">변경 완료</button>
        </form>
      </dialog>

      <dialog className="demo-dialog" ref={demoRef}>
        <div className="demo-head">
          <div><small>DEMO SCENARIOS</small><h3>사용자 시연 바로 실행</h3></div>
          <button id="demoClose" aria-label="닫기">×</button>
        </div>
        <div className="demo-grid">
          <button data-demo="1"><b>01</b><span>실검 → 최신폰</span></button>
          <button data-demo="2"><b>02</b><span>FAQ 미응답</span></button>
          <button data-demo="3"><b>03</b><span>응답 실패 → 재시도</span></button>
          <button data-demo="4"><b>04</b><span>로그인 유도</span></button>
          <button data-demo="5"><b>05</b><span>세션 승계</span></button>
          <button data-demo="6"><b>06</b><span>모호 질문 재질문</span></button>
          <button data-demo="8"><b>08</b><span>캐시 효과</span></button>
          <button data-demo="9"><b>09</b><span>방문 예약</span></button>
        </div>
      </dialog>
    </>
  )
}
