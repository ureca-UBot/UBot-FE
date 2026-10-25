import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/hooks/useAuth'
import { ProductSubscribeFlow } from '../../subscription/components/ProductSubscribeFlow'
import type { ProductCatalogKind, ProductDetailView } from '../catalog'
import { productArtwork } from '../artwork'
import { productDescriptionItems } from '../utils/description'
import { ProductName } from './ProductName'

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
  const { user } = useAuth()
  const navigate = useNavigate()
  // 가입 신청 창을 열었는지와, 마지막 신청 결과 안내입니다.
  const [subscribing, setSubscribing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const descriptionItems = productDescriptionItems(detail?.description ?? null)

  // 가입은 로그인한 사용자만 신청할 수 있어, 로그인하지 않았으면 로그인 화면으로 보냅니다.
  function startSubscribe() {
    if (!user) {
      navigate('/auth/login')
      return
    }
    setNotice(null)
    setSubscribing(true)
  }

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
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : '상품 정보를 불러오지 못했습니다.')
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
            <h3 aria-label={detail?.name}>
              {detail ? (
                <ProductName name={detail.name} />
              ) : error ? (
                '상품 정보를 볼 수 없습니다'
              ) : (
                '상품 정보를 불러오는 중입니다.'
              )}
            </h3>
          </div>
          <button value="cancel" aria-label="닫기">
            ×
          </button>
        </div>

        {error && (
          <p className="product-detail-error" role="alert">
            {error}
          </p>
        )}

        {detail && (
          <>
            <div className="product-detail-overview">
              <div className="product-detail-price">
                <span>{detail.priceLabel}</span>
                <b>{detail.price}</b>
              </div>
              <div className="product-detail-art" aria-hidden="true">
                <img alt="" src={productArtwork[detail.artwork].src} width={960} height={640} />
              </div>
            </div>
            {detail.rows.length > 0 && (
              <section className="product-detail-section" aria-label="상품 제공 내용">
                <h4>상품 제공 내용</h4>
                <dl className="product-detail-rows">
                  {detail.rows.map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>
                        {Array.isArray(row.value) ? (
                          <ul className="product-detail-included">
                            {row.value.map((value, index) => (
                              <li key={`${value}-${index}`}>{value}</li>
                            ))}
                          </ul>
                        ) : (
                          row.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {descriptionItems.length > 0 && (
              <section className="product-detail-section" aria-label="이용 안내">
                <h4>이용 안내</h4>
                <ul className="product-detail-benefits">
                  {descriptionItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {notice && (
          <p className="my-profile-message" role="status">
            {notice}
          </p>
        )}

        {detail && (
          <button className="black-btn modal-full" onClick={startSubscribe} type="button">
            {user ? '가입하기' : '로그인하고 가입하기'}
          </button>
        )}
        <button className={detail ? 'outline-wide' : 'black-btn modal-full'} value="default">
          확인
        </button>
      </form>

      {subscribing && detail && (
        <ProductSubscribeFlow
          kind={kind.key}
          onClose={() => setSubscribing(false)}
          onDone={(message) => {
            setSubscribing(false)
            setNotice(`${message} MY에서 가입 정보를 확인할 수 있어요.`)
          }}
          productId={productId}
          productName={detail.name}
        />
      )}
    </dialog>
  )
}
