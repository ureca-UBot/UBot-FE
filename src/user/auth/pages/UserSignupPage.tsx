import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../../auth/api/authApi'
import type { SignupRequest } from '../../../auth/types/auth'

const initialForm: SignupRequest = {
  email: '', password: '', passwordConfirm: '', name: '', birthDate: '', gender: 'MALE', residenceArea: '',
}

export function UserSignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<SignupRequest>(initialForm)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    <main className="login-page">
      <section className="login-card signup-card" aria-labelledby="signup-title">
        <h1 id="signup-title">회원가입</h1>
        <p>UBot 일반 사용자 계정을 만들어 주세요.</p>
        <form className="signup-form" onSubmit={handleSubmit}>
          <label className="signup-form__full">이메일<input autoComplete="email" maxLength={100} onChange={(event) => updateField('email', event.target.value)} required type="email" value={form.email} /></label>
          <label>비밀번호<input autoComplete="new-password" maxLength={20} minLength={8} onChange={(event) => updateField('password', event.target.value)} required type="password" value={form.password} /></label>
          <label>비밀번호 확인<input autoComplete="new-password" maxLength={20} minLength={8} onChange={(event) => updateField('passwordConfirm', event.target.value)} required type="password" value={form.passwordConfirm} /></label>
          <label>이름<input maxLength={20} onChange={(event) => updateField('name', event.target.value)} required value={form.name} /></label>
          <label>생년월일<input max={new Date().toISOString().slice(0, 10)} onChange={(event) => updateField('birthDate', event.target.value)} required type="date" value={form.birthDate} /></label>
          <label>성별<select onChange={(event) => updateField('gender', event.target.value as SignupRequest['gender'])} value={form.gender}><option value="MALE">남성</option><option value="FEMALE">여성</option></select></label>
          <label>거주 지역<input maxLength={100} onChange={(event) => updateField('residenceArea', event.target.value)} required value={form.residenceArea} /></label>
          {errorMessage && <p className="login-error signup-form__full" role="alert">{errorMessage}</p>}
          <button className="primary-button signup-form__full" disabled={isSubmitting} type="submit">{isSubmitting ? '가입 중...' : '회원가입'}</button>
        </form>
        <p className="auth-page-link"><Link to="/auth/login">로그인</Link></p>
      </section>
    </main>
  )
}
