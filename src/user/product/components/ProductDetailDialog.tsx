import { useEffect, useRef, useState } from 'react'
import type { ProductCatalogKind, ProductDetailView } from '../catalog'

interface ProductDetailDialogProps {
  kind: ProductCatalogKind
  productId: number
  onClose: () => void
}

// 열 때마다 단건 조회로 다시 받습니다. 목록을 받은 뒤 판매가 중지된 상품이면 여기서 "찾을 수 없습니다"가 나옵니다.
export function ProductDetailDialog({ kind, productId, onClose }: ProductDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [detail, setDetail] = useState<ProductDetailView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    // Esc나 닫기 버튼으로 닫힌 경우에도 부모 상태를 맞춥니다.
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [onClose])

  useEffect(() => {
    let cancelled = false

    void kind
      .getDetail(productId)
      .then((next) => {
        if (!cancelled) setDetail(next)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '상품 정보를 불러오지 못했습니다.')
      })

    return () => {
      cancelled = true
    }
  }, [kind, productId])

  return (
    <dialog className="modal product-detail-dialog" ref={dialogRef}>
      <form method="dialog">
        <div className="modal-head">
          <div>
            <small>{detail?.badge ?? kind.label}</small>
            <h3>{detail?.name ?? (error ? '상품 정보를 볼 수 없습니다' : '상품 정보를 불러오는 중입니다.')}</h3>
          </div>
          <button value="cancel" aria-label="닫기">×</button>
        </div>

        {error && <p className="product-detail-error" role="alert">{error}</p>}

        {detail && (
          <>
            <div className="product-detail-price"><span>{detail.priceLabel}</span><b>{detail.price}</b></div>
            {detail.description && <p className="product-detail-description">{detail.description}</p>}
            {detail.rows.length > 0 && (
              <dl className="product-detail-rows">
                {detail.rows.map((row) => (
                  <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
                ))}
              </dl>
            )}
          </>
        )}

        <button className="black-btn modal-full" value="default">확인</button>
      </form>
    </dialog>
  )
}
