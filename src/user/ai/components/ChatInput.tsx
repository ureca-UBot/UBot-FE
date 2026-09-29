import { useState, type FormEvent, type KeyboardEvent } from 'react'

interface ChatInputProps {
  id: string
  large?: boolean
  disabled: boolean
  onSend: (question: string) => Promise<boolean>
}

export function ChatInput({ id, large = false, disabled, onSend }: ChatInputProps) {
  const [question, setQuestion] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled || !question.trim()) return
    void onSend(question)
    setQuestion('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
    event.preventDefault()
    if (!disabled) event.currentTarget.form?.requestSubmit()
  }

  return (
    <form className={`ai-searchbox${large ? ' large' : ''}`} onSubmit={handleSubmit}>
      <textarea
        id={id} rows={1} placeholder="궁금한 내용을 입력해 주세요." aria-label="AI 검색어"
        value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown}
        maxLength={4000} required disabled={disabled}
      />
      <button className="voice" type="button" aria-label="음성 입력" title="음성 입력 준비 중" disabled>◉</button>
      <button
        className="send-ai" type="submit" aria-label="질문 보내기"
        disabled={disabled || !question.trim()} style={{ opacity: disabled || !question.trim() ? 0.5 : 1 }}
      >↑</button>
    </form>
  )
}
