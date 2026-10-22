import { useEffect, useState, type FormEvent } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { adminInquiryApi } from '../api/inquiryApi'
import type { AdminInquiry, InquiryStatus } from '../types/inquiry'
import { errorText } from '../utils/format'

export function useInquiryManagement() {
  const [status, setStatus] = useState<InquiryStatus | ''>('')
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<PageResponse<AdminInquiry> | null>(null)
  const [selected, setSelected] = useState<AdminInquiry | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    adminInquiryApi
      .getAll(page, status)
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
  }, [page, status, revision])

  async function select(id: number) {
    try {
      const item = await adminInquiryApi.getOne(id)
      setSelected(item)
      setReply('')
      setError(null)
    } catch (caught) {
      setError(errorText(caught))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !reply.trim()) return
    setBusy(true)
    try {
      const updated = await adminInquiryApi.reply(selected.inquiry.id, reply.trim())
      setSelected(updated)
      setRevision((current) => current + 1)
      setError(null)
    } catch (caught) {
      setError(errorText(caught))
      setRevision((current) => current + 1)
      try {
        setSelected(await adminInquiryApi.getOne(selected.inquiry.id))
      } catch {
        setSelected(null)
      }
    } finally {
      setBusy(false)
    }
  }

  return {
    result,
    select,
    status,
    setStatus,
    setPage,
    setSelected,
    error,
    page,
    selected,
    submit,
    setReply,
    reply,
    busy,
  }
}
