import { useState, type FormEvent } from 'react'
import type { AdminProduct } from '../types/product'
import type { ProductKind } from '../types/productKind'

interface ProductFormModalProps<TDetail, TValues, TCreate, TUpdate> {
  kind: ProductKind<TDetail, TValues, TCreate, TUpdate>
  // null이면 등록, 값이 있으면 그 상품을 수정합니다.
  product: AdminProduct<TDetail> | null
  onClose: () => void
  onSaved: () => void
}

export function ProductFormModal<TDetail, TValues, TCreate, TUpdate>({
  kind,
  product,
  onClose,
  onSaved,
}: ProductFormModalProps<TDetail, TValues, TCreate, TUpdate>) {
  const isCreate = product === null
  const [values, setValues] = useState<TValues>(() => (product ? kind.valuesFrom(product.detail) : kind.blankValues))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalid = kind.validate(values, isCreate)
    if (invalid) {
      setError(invalid)
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (product) await kind.api.updateProduct(kind.idOf(product.detail), kind.toUpdateRequest(values))
      else await kind.api.createProduct(kind.toCreateRequest(values))
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `${kind.label}을(를) 저장하지 못했습니다.`)
    } finally {
      setSaving(false)
    }
  }

  // 입력이 많아서 바깥을 눌러도 닫지 않습니다. 실수로 닫히면 입력한 내용이 사라집니다.
  return (
    <div className="modal-backdrop">
      <form aria-labelledby="product-form-title" aria-modal="true" className="faq-modal admin-product-form" onSubmit={(event) => void save(event)} role="dialog">
        <h2 id="product-form-title">{kind.label} {isCreate ? '등록' : '수정'}</h2>

        <div className="admin-product-form__grid">
          <kind.FormFields
            isCreate={isCreate}
            onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
            values={values}
          />
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
