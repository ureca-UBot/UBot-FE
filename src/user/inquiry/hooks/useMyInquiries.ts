import { useEffect, useState, type FormEvent } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { inquiryApi, type Inquiry } from '../inquiryApi'
import { errorText } from '../utils/format'

export function useMyInquiries({ active }: { active: boolean }) {
  const [result, setResult] = useState<PageResponse<Inquiry> | null>(null)
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<Inquiry | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let canceled = false
    inquiryApi
      .getMine(page)
      .then((next) => {
        if (!canceled) {
          setResult(next)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (!canceled) setError(errorText(caught))
      })
    return () => {
      canceled = true
    }
  }, [active, page, revision])

  function openForm(item: Inquiry | null) {
    setEditing(item)
    setTitle(item?.title ?? '')
    setContent(item?.content ?? '')
    setFormError(null)
    setFormOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      setFormError('제목과 내용을 입력해 주세요.')
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      if (editing) await inquiryApi.update(editing.id, title.trim(), content.trim())
      else await inquiryApi.create(title.trim(), content.trim())
      setFormOpen(false)
      setEditing(null)
      setPage(0)
      setRevision((current) => current + 1)
      setFormError(null)
    } catch (caught) {
      setFormError(errorText(caught))
      setRevision((current) => current + 1)
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: Inquiry) {
    if (!window.confirm('답변 전 문의를 삭제할까요? 삭제한 문의는 복구할 수 없습니다.')) return
    setBusy(true)
    try {
      await inquiryApi.delete(item.id)
      setRevision((current) => current + 1)
      setError(null)
    } catch (caught) {
      setError(errorText(caught))
      setRevision((current) => current + 1)
    } finally {
      setBusy(false)
    }
  }

  return {
    openForm,
    formOpen,
    submit,
    setTitle,
    title,
    setContent,
    content,
    setFormOpen,
    busy,
    editing,
    error,
    formError,
    result,
    remove,
    page,
    setPage,
  }
}
