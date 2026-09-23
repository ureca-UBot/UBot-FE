import { useEffect, useState, type FormEvent } from 'react'
import { ApiRequestError } from '../../../shared/api/client'
import { profileApi } from '../api/profileApi'
import type { Gender, UserProfile, UserProfileUpdateRequest } from '../types/profile'

const genderLabels: Record<Gender, string> = { MALE: '남성', FEMALE: '여성' }

interface ProfileForm {
  name: string
  birthDate: string
  gender: Gender | ''
  residenceArea: string
}

function toForm(profile: UserProfile): ProfileForm {
  return {
    name: profile.name,
    birthDate: profile.birthDate ?? '',
    gender: profile.gender ?? '',
    residenceArea: profile.residenceArea ?? '',
  }
}

function today() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

// BE UserUpdateRequestDto와 같은 제약을 먼저 확인합니다.
function validate(form: ProfileForm) {
  const name = form.name.trim()
  const residenceArea = form.residenceArea.trim()
  if (!name) return '이름을 입력해 주세요.'
  if (name.length > 20) return '이름은 20자까지 입력할 수 있습니다.'
  if (!residenceArea) return '거주 지역을 입력해 주세요.'
  if (residenceArea.length > 100) return '거주 지역은 100자까지 입력할 수 있습니다.'
  if (form.birthDate && form.birthDate > today()) return '생년월일은 오늘 이후로 입력할 수 없습니다.'
  return null
}

// PATCH /auth/me는 보낸 항목만 수정하므로 바뀐 값만 담습니다.
function changedFields(profile: UserProfile, form: ProfileForm): UserProfileUpdateRequest {
  const request: UserProfileUpdateRequest = {}
  const name = form.name.trim()
  const residenceArea = form.residenceArea.trim()
  if (name !== profile.name) request.name = name
  if (form.birthDate && form.birthDate !== profile.birthDate) request.birthDate = form.birthDate
  if (form.gender && form.gender !== profile.gender) request.gender = form.gender
  if (residenceArea !== (profile.residenceArea ?? '')) request.residenceArea = residenceArea
  return request
}

function errorMessage(error: unknown, fallback: string) {
  // access token 만료 시 자동 재발급이 아직 없어 새로고침(앱 시작 시 refresh)으로 안내합니다.
  if (error instanceof ApiRequestError && error.status === 401) {
    return '로그인이 만료되었습니다. 새로고침하거나 다시 로그인해 주세요.'
  }
  return error instanceof Error ? error.message : fallback
}

export function MyProfileCard({ active }: { active: boolean }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // 모든 사용자 화면이 함께 렌더링되므로 MY 화면이 열렸을 때만 조회합니다.
  useEffect(() => {
    if (!active) return undefined
    let cancelled = false
    profileApi.getMe()
      .then((result) => {
        if (cancelled) return
        setProfile(result)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error, '회원 정보를 불러오지 못했습니다.'))
      })
    return () => { cancelled = true }
  }, [active])

  function updateField<Key extends keyof ProfileForm>(key: Key, value: ProfileForm[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function startEdit() {
    if (!profile) return
    setForm(toForm(profile))
    setSaveError(null)
    setNotice(null)
  }

  function cancelEdit() {
    setForm(null)
    setSaveError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || !form) return

    const validationError = validate(form)
    if (validationError) {
      setSaveError(validationError)
      return
    }

    const request = changedFields(profile, form)
    if (Object.keys(request).length === 0) {
      setForm(null)
      setNotice('변경된 내용이 없습니다.')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const updated = await profileApi.updateMe(request)
      setProfile(updated)
      setForm(null)
      setNotice('회원 정보를 수정했습니다.')
    } catch (error) {
      setSaveError(errorMessage(error, '회원 정보를 수정하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="my-profile" aria-labelledby="myProfileTitle">
      <div className="my-profile-head">
        <h3 id="myProfileTitle">회원 정보</h3>
        {profile && !form && <button className="my-profile-ghost" onClick={startEdit} type="button">수정</button>}
      </div>

      {!profile && !loadError && <p className="my-profile-message">회원 정보를 불러오는 중입니다.</p>}
      {loadError && <p className="my-profile-message error" role="alert">{loadError}</p>}

      {profile && !form && (
        <dl className="my-profile-list">
          <dt>이메일</dt><dd>{profile.email}</dd>
          <dt>이름</dt><dd>{profile.name}</dd>
          <dt>생년월일</dt><dd>{profile.birthDate ?? '-'}</dd>
          <dt>성별</dt><dd>{profile.gender ? genderLabels[profile.gender] : '-'}</dd>
          <dt>거주 지역</dt><dd>{profile.residenceArea ?? '-'}</dd>
          <dt>가입일</dt><dd>{profile.createdAt.slice(0, 10)}</dd>
        </dl>
      )}

      {profile && form && (
        <form className="my-profile-form" onSubmit={handleSubmit}>
          <label className="my-profile-form__full"><span>이메일</span><input disabled value={profile.email} /></label>
          <label><span>이름</span><input disabled={saving} maxLength={20} onChange={(event) => updateField('name', event.target.value)} required value={form.name} /></label>
          <label><span>생년월일</span><input disabled={saving} max={today()} onChange={(event) => updateField('birthDate', event.target.value)} type="date" value={form.birthDate} /></label>
          <label><span>성별</span>
            <select disabled={saving} onChange={(event) => updateField('gender', event.target.value as ProfileForm['gender'])} value={form.gender}>
              {!form.gender && <option value="">선택해 주세요</option>}
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
            </select>
          </label>
          <label><span>거주 지역</span><input disabled={saving} maxLength={100} onChange={(event) => updateField('residenceArea', event.target.value)} required value={form.residenceArea} /></label>
          {saveError && <p className="my-profile-message error my-profile-form__full" role="alert">{saveError}</p>}
          <div className="my-profile-actions">
            <button className="my-profile-ghost" disabled={saving} onClick={cancelEdit} type="button">취소</button>
            <button className="black-btn" disabled={saving} type="submit">{saving ? '저장 중...' : '저장'}</button>
          </div>
        </form>
      )}

      {notice && !form && <p className="my-profile-message" role="status">{notice}</p>}
    </section>
  )
}
