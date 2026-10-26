import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import type { AdminProduct } from '../types/product'
import type { ProductKindDisplay } from '../types/productKind'

const dateTime = (value: string | null | undefined) =>
  value ? value.replace('T', ' ').slice(0, 16) : '-'

export function ProductDetailModal<TDetail>({
  kind,
  product,
  onClose,
}: {
  kind: ProductKindDisplay<TDetail>
  product: AdminProduct<TDetail>
  onClose: () => void
}) {
  const ref = useModalFocus<HTMLElement>(onClose)
  const { detail, metadata, status } = product
  const fields =
    kind.detailFields?.(detail) ??
    kind.columns.map(({ header, text }) => ({ label: header, value: text(detail) }))
  const description = kind.descriptionOf(detail)
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={ref}
        className="faq-modal admin-product-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
      >
        <header className="faq-reader-head">
          <div>
            <span>
              {kind.label} · #{kind.idOf(detail)}
            </span>
            <h2 id="product-detail-title">{kind.label} 상세정보</h2>
          </div>
          <span
            className={`admin-product-status admin-product-status--${metadata.deletedAt ? 'inactive' : status === 'ACTIVE' ? 'active' : 'inactive'}`}
          >
            {metadata.deletedAt ? '삭제됨' : status === 'ACTIVE' ? '활성' : '비활성'}
          </span>
        </header>
        <div className="admin-product-detail__identity">
          <p>{kind.codeOf(detail)}</p>
          <h3>{kind.nameOf(detail)}</h3>
        </div>
        <dl className="admin-product-detail__specs">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <section className="admin-product-detail__description" aria-label="상품 설명">
          <h3>상품 설명</h3>
          <p>{description?.trim() ? description : '등록된 상품 설명이 없습니다.'}</p>
        </section>
        <dl className="faq-reader-meta">
          <dt>등록일</dt>
          <dd>{dateTime(metadata.createdAt)}</dd>
          <dt>수정일</dt>
          <dd>{dateTime(metadata.updatedAt)}</dd>
          <dt>등록 관리자</dt>
          <dd>{metadata.createdBy ?? '-'}</dd>
          <dt>수정 관리자</dt>
          <dd>{metadata.updatedBy ?? '-'}</dd>
          {metadata.deletedAt && (
            <>
              <dt>삭제일</dt>
              <dd>{dateTime(metadata.deletedAt)}</dd>
            </>
          )}
        </dl>
        <div className="faq-modal__actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}
