import { useEffect, useRef, type FormEvent } from 'react'

interface UserLoginModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UserLoginModal({ open, onClose, onSuccess }: UserLoginModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSuccess()
  }

  return (
    <dialog className="modal login-modal" ref={dialogRef} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-head">
          <div><small>LOGIN DEMO</small><h3>U봇 로그인</h3></div>
          <button type="button" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <p className="login-guide">현재는 사용자 UI 이관을 위한 시연 화면입니다. 인증 기능은 팀의 공통 인증 구조와 이후 연결됩니다.</p>
        <label><span>이메일</span><input type="email" defaultValue="user@ubot.com" required /></label>
        <label><span>비밀번호</span><input type="password" defaultValue="password" required /></label>
        <button className="black-btn modal-full" type="submit">로그인</button>
      </form>
    </dialog>
  )
}
