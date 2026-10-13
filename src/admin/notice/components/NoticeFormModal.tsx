import { useState, type FormEvent } from 'react'
import { NOTICE_REGIONS, NOTICE_REGION_LABELS, NOTICE_TYPE_LABELS, type NoticeRegion, type NoticeType } from '../../../shared/types/notice'
import { adminNoticeApi } from '../api/noticeApi'
import {
    NOTICE_CONTENT_MAX_LENGTH,
    NOTICE_TITLE_MAX_LENGTH,
    type AdminNotice,
    type NoticeFormValues,
} from '../types/notice'
import { BLANK_NOTICE_VALUES, toNoticeRequest, validateNotice, valuesFromNotice } from '../utils/formValues'

interface NoticeFormModalProps {
    // null이면 등록, 값이 있으면 그 공지를 수정합니다.
    notice: AdminNotice | null
    onClose: () => void
    onSaved: () => void
}

export function NoticeFormModal({ notice, onClose, onSaved }: NoticeFormModalProps) {
    const isCreate = notice === null
    const [values, setValues] = useState<NoticeFormValues>(() => (notice ? valuesFromNotice(notice.detail) : BLANK_NOTICE_VALUES))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function change(patch: Partial<NoticeFormValues>) {
        setValues((current) => ({ ...current, ...patch }))
    }

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const original = notice?.detail ?? null
        const invalid = validateNotice(values, original)
        if (invalid) {
            setError(invalid)
            return
        }

        setSaving(true)
        setError(null)
        try {
            const request = toNoticeRequest(values, original)
            if (notice) await adminNoticeApi.updateNotice(notice.detail.noticeId, request)
            else await adminNoticeApi.createNotice(request)
            onSaved()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '공지를 저장하지 못했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // 입력이 많아서 바깥을 눌러도 닫지 않습니다. 실수로 닫히면 입력한 내용이 사라집니다.
    return (
        <div className="modal-backdrop">
            <form aria-labelledby="notice-form-title" aria-modal="true" className="faq-modal admin-notice-form" onSubmit={(event) => void save(event)} role="dialog">
                <h2 id="notice-form-title">공지·장애 {isCreate ? '등록' : '수정'}</h2>

                <div className="admin-notice-form__grid">
                    <label>
                        유형
                        <select onChange={(event) => change({ type: event.target.value as NoticeType })} value={values.type}>
                            {(Object.keys(NOTICE_TYPE_LABELS) as NoticeType[]).map((type) => (
                                <option key={type} value={type}>{type === 'OUTAGE' ? '장애 (통신 장애 안내)' : '공지'}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        대상 지역
                        <select onChange={(event) => change({ targetRegion: event.target.value as NoticeRegion | '' })} value={values.targetRegion}>
                            <option value="">전체</option>
                            {NOTICE_REGIONS.map((region) => <option key={region} value={region}>{NOTICE_REGION_LABELS[region]}</option>)}
                        </select>
                        <small className="admin-notice-form__hint">지역을 고르면 배너는 접속 IP가 그 지역으로 확인된 사용자에게만 보입니다.</small>
                    </label>

                    <label className="admin-notice-form__full">
                        제목
                        <input maxLength={NOTICE_TITLE_MAX_LENGTH} onChange={(event) => change({ title: event.target.value })} value={values.title} />
                    </label>

                    <label className="admin-notice-form__full">
                        내용
                        <textarea
                            maxLength={NOTICE_CONTENT_MAX_LENGTH}
                            onChange={(event) => change({ content: event.target.value })}
                            placeholder="배너의 '자세히'를 누르면 보이는 내용입니다."
                            value={values.content}
                        />
                    </label>

                    <label className="admin-notice-form__full">
                        노출 종료 시각 (선택)
                        <input onChange={(event) => change({ endsAt: event.target.value })} type="datetime-local" value={values.endsAt} />
                        <small className="admin-notice-form__hint">비워 두면 삭제하기 전까지 계속 노출됩니다. 종료 후에도 공지 목록에는 남습니다.</small>
                    </label>
                </div>

                {error && <p className="login-error">{error}</p>}

                <div className="faq-modal__actions">
                    <button className="secondary-button" disabled={saving} onClick={onClose} type="button">취소</button>
                    <button className="primary-button" disabled={saving} type="submit">{saving ? '저장 중...' : '저장'}</button>
                </div>
            </form>
        </div>
    )
}