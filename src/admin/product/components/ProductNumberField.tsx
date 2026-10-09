interface ProductNumberFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  // 기본 9자리는 백엔드 Integer 범위 안에 들어옵니다. Long 필드는 더 길게 줍니다.
  maxLength?: number
  placeholder?: string
  hint?: string
  disabled?: boolean
}

// 숫자만 남깁니다. 음수·소수·지수 표기가 들어갈 수 없으므로 값은 빈 문자열이거나 0 이상의 정수입니다.
export function ProductNumberField({ label, value, onChange, maxLength = 9, placeholder, hint, disabled = false }: ProductNumberFieldProps) {
  return (
    <label>
      {label}
      <input
        disabled={disabled}
        inputMode="numeric"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        value={value}
      />
      {hint && <small className="admin-product-form__hint">{hint}</small>}
    </label>
  )
}
