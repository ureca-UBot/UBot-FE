import { useState, type FormEvent, type KeyboardEvent } from 'react'

interface ChatInputProps {
  id: string
  large?: boolean
  disabled: boolean
  isGenerating: boolean
  onCancel: () => void
  onSend: (question: string) => Promise<boolean>
}

export function ChatInput({
  id,
  large = false,
  disabled,
  isGenerating,
  onCancel,
  onSend,
}: ChatInputProps) {
  const [question, setQuestion] = useState('')
  const buttonDisabled = !isGenerating && (disabled || !question.trim())

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled || isGenerating || !question.trim()) return
    void onSend(question)
    setQuestion('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    )
      return
    event.preventDefault()
    if (!disabled) event.currentTarget.form?.requestSubmit()
  }

  return (
    <form className={`ai-searchbox${large ? ' large' : ''}`} onSubmit={handleSubmit}>
      <textarea
        id={id}
        rows={1}
        placeholder="궁금한 내용을 입력해 주세요."
        aria-label="AI 채팅 입력"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={4000}
        required
      />
      <button
        className="send-ai"
        type={isGenerating ? 'button' : 'submit'}
        aria-label={isGenerating ? '답변 생성 중단' : '질문 보내기'}
        title={isGenerating ? '답변 생성 중단' : '질문 보내기'}
        onClick={isGenerating ? onCancel : undefined}
        disabled={buttonDisabled}
        style={{ opacity: buttonDisabled ? 0.5 : 1 }}
      >
        {isGenerating ? '■' : '↑'}
      </button>
    </form>
  )
}
