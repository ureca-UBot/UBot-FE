import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../../auth/api/authApi'
import type { SignupRequest } from '../../../auth/types/auth'
import { AuthLayout } from '../../../auth/components/AuthLayout'
import { PasswordField } from '../../../auth/components/PasswordField'

const initialForm: SignupRequest = {
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  birthDate: '',
  gender: 'MALE',
  residenceArea: '',
}

export function UserSignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<SignupRequest>(initialForm)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const validPasswordLength = form.password.length >= 8 && form.password.length <= 20
  const passwordsMatch = validPasswordLength && form.password === form.passwordConfirm

  function updateField<Key extends keyof SignupRequest>(key: Key, value: SignupRequest[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (form.password !== form.passwordConfirm) {
      setErrorMessage('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)
    try {
      await authApi.signup(form)
      navigate('/auth/login?signup=success', { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '회원가입에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout mode="signup">
      <form className="auth-form" onSubmit={handleSubmit}>
        <fieldset className="auth-field-group">
          <legend>계정 정보</legend>
          <label className="auth-field">
            이메일
            <input
              autoComplete="email"
              name="email"
              placeholder="example@email.com"
              maxLength={100}
              onChange={(event) => updateField('email', event.target.value)}
              required
              type="email"
              value={form.email}
            />
          </label>
          <div className="auth-field-row">
            <PasswordField
              label="비밀번호"
              name="password"
              placeholder="8~20자"
              autoComplete="new-password"
              maxLength={20}
              minLength={8}
              onChange={(event) => updateField('password', event.target.value)}
              value={form.password}
              validation={{
                status: validPasswordLength ? 'valid' : 'invalid',
                message: validPasswordLength
                  ? '사용 가능한 길이입니다.'
                  : '8~20자로 입력해 주세요.',
              }}
            />
            <PasswordField
              label="비밀번호 확인"
              name="passwordConfirm"
              placeholder="다시 입력"
              autoComplete="new-password"
              maxLength={20}
              minLength={8}
              onChange={(event) => updateField('passwordConfirm', event.target.value)}
              value={form.passwordConfirm}
              validation={{
                status: passwordsMatch ? 'valid' : 'invalid',
                message: passwordsMatch
                  ? '비밀번호가 일치합니다.'
                  : '비밀번호가 일치하지 않습니다.',
              }}
            />
          </div>
        </fieldset>
        <fieldset className="auth-field-group">
          <legend>기본 정보</legend>
          <div className="auth-field-row">
            <label className="auth-field">
              이름
              <input
                maxLength={20}
                name="name"
                autoComplete="name"
                placeholder="이름 입력"
                onChange={(event) => updateField('name', event.target.value)}
                required
                value={form.name}
              />
            </label>
            <label className="auth-field">
              생년월일
              <input
                max={new Date().toISOString().slice(0, 10)}
                name="birthDate"
                autoComplete="bday"
                onChange={(event) => updateField('birthDate', event.target.value)}
                required
                type="date"
                value={form.birthDate}
              />
            </label>
          </div>
          <div className="auth-field-row">
            <label className="auth-field">
              성별
              <select
                name="gender"
                onChange={(event) => {
                  const gender = event.target.value
                  if (gender === 'MALE' || gender === 'FEMALE') updateField('gender', gender)
                }}
                value={form.gender}
              >
                <option value="MALE">남성</option>
                <option value="FEMALE">여성</option>
              </select>
            </label>
            <label className="auth-field">
              거주 지역
              <input
                maxLength={100}
                name="residenceArea"
                autoComplete="address-level1"
                placeholder="예: 서울특별시"
                onChange={(event) => updateField('residenceArea', event.target.value)}
                required
                value={form.residenceArea}
              />
            </label>
          </div>
        </fieldset>
        {errorMessage && (
          <p className="auth-feedback auth-feedback--error" role="alert">
            {errorMessage}
          </p>
        )}
        <button className="auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? '가입 중...' : '회원가입'}
        </button>
      </form>
      <div className="auth-switch">
        <span>이미 계정이 있으신가요?</span>
        <Link to="/auth/login">
          로그인 <span aria-hidden="true">›</span>
        </Link>
      </div>
    </AuthLayout>
  )
}
