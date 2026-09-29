import { useState, type FormEvent } from 'react'
import { adminForbiddenWordApi } from '../api/forbiddenWordApi'
import type { ForbiddenWordResponse } from '../types/forbiddenWord'

interface ForbiddenWordEditModalProps {
  forbiddenWord: ForbiddenWordResponse
  onClose: () => void
  onSaved: () => void
}

export function ForbiddenWordEditModal({ forbiddenWord, onClose, onSaved }: ForbiddenWordEditModalProps) {
  const [word, setWord] = useState(forbiddenWord.word)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!word.trim()) {
      setError('금지어를 입력해주세요.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      // 단어만 바꾸며 상태는 백엔드에서 그대로 유지됩니다.
      await adminForbiddenWordApi.updateForbiddenWord(forbiddenWord.id, { word: word.trim() })
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '금지어를 수정하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form aria-labelledby="forbidden-word-edit-title" aria-modal="true" className="faq-modal" onSubmit={(event) => void save(event)} role="dialog">
        <h2 id="forbidden-word-edit-title">금지어 수정</h2>
        <label>
          금지어
          <input autoFocus maxLength={100} onChange={(event) => setWord(event.target.value)} value={word} />
        </label>
        {error && <p className="login-error">{error}</p>}
        <div className="faq-modal__actions">
          <button className="primary-button" disabled={saving} type="submit">{saving ? '수정 중...' : '수정'}</button>
          <button className="secondary-button" disabled={saving} onClick={onClose} type="button">취소</button>
        </div>
      </form>
    </div>
  )
}
