import { useEffect, useState } from 'react'
import { counselApi } from '../api/counselApi'
import type { CustomerInfo } from '../types/counsel'

export function CounselCustomerPanel({ sessionId }: { sessionId: string }) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{
    revision: number
    customer?: CustomerInfo
    error?: string
  } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    counselApi
      .customer(sessionId, controller.signal)
      .then((customer) => {
        if (!controller.signal.aborted) setState({ revision, customer })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            revision,
            error: error instanceof Error ? error.message : '고객 정보를 불러오지 못했습니다.',
          })
      })
    return () => controller.abort()
  }, [sessionId, revision])
  const current = state?.revision === revision ? state : null
  const customer = current?.customer
  return (
    <aside className="counsel-customer" aria-labelledby="counselCustomerTitle">
      <div className="counsel-customer__head">
        <h3 id="counselCustomerTitle">연결된 고객</h3>
        <button
          type="button"
          className="counsel-customer__refresh"
          disabled={!current}
          onClick={() => setRevision((value) => value + 1)}
        >
          정보 새로고침
        </button>
      </div>
      {!current ? (
        <p className="status-line" role="status">
          고객 정보를 불러오고 있어요.
        </p>
      ) : current.error ? (
        <p className="counsel-customer__error" role="alert">
          {current.error}
        </p>
      ) : (
        customer && (
          <>
            <strong className="counsel-customer__name">{customer.name || '이름 확인 불가'}</strong>
            <div className="counsel-customer__lines">
              {(customer.lines ?? []).map((line) => (
                <section
                  className="counsel-customer__line"
                  key={line.subscriptionId}
                  aria-label={`${line.phoneNumber} 회선`}
                >
                  <div>
                    <strong>{line.phoneNumber}</strong>
                    <small>{line.status === 'SUSPENDED' ? '일시정지' : '사용 중'}</small>
                  </div>
                  <dl>
                    <dt>요금제</dt>
                    <dd>{line.planName}</dd>
                    {!!line.addons.length && (
                      <>
                        <dt>부가서비스</dt>
                        <dd>{line.addons.join(', ')}</dd>
                      </>
                    )}
                    {!!line.bundles.length && (
                      <>
                        <dt>결합</dt>
                        <dd>{line.bundles.join(', ')}</dd>
                      </>
                    )}
                    {!!line.roamings.length && (
                      <>
                        <dt>로밍</dt>
                        <dd>{line.roamings.join(', ')}</dd>
                      </>
                    )}
                  </dl>
                </section>
              ))}
              {(customer.homeProducts ?? []).map((product) => (
                <section className="counsel-customer__line" key={`home-${product.subscriptionId}`}>
                  <small>{product.productType === 'IPTV' ? 'IPTV' : '인터넷'}</small>
                  <p>{product.name}</p>
                </section>
              ))}
            </div>
            {!customer.lines?.length && !customer.homeProducts?.length && (
              <p className="status-line">이용 중인 회선·상품이 없습니다.</p>
            )}
          </>
        )
      )}
    </aside>
  )
}
