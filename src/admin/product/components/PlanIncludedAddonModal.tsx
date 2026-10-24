import { useEffect, useState, type FormEvent } from 'react'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import { ADDON_CATEGORY_LABELS, formatWon } from '../../../shared/product/format'
import type { AddonService } from '../../../shared/product/types'
import { adminAddonServiceApi, adminPlanIncludedAddonApi } from '../api/productApi'
import type { ProductRowActionModalProps } from '../types/productKind'
import { errorMessage } from '../utils/listState'

// 백엔드 AdminPlanIncludedAddonRequestDto의 목록 최대 크기입니다.
const MAX_INCLUDED_ADDONS = 20

// 요금제에 포함된 부가서비스를 고릅니다. 저장하면 고른 목록으로 통째로 바뀝니다.
// 포함 부가서비스는 이 요금제로 가입·변경하는 회선에 0원으로 함께 가입됩니다.
export function PlanIncludedAddonModal({
  productId,
  productName,
  onClose,
}: ProductRowActionModalProps) {
  const modalFocusRef = useModalFocus<HTMLFormElement>(() => {
    if (saving) return
    onClose()
  })

  const [addons, setAddons] = useState<AddonService[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    adminAddonServiceApi
      .getProductList({ keyword: '', status: null, deleted: false, page: 0, size: 100 })
      .then((page) => {
        if (!cancelled) setAddons(page.content.map((product) => product.detail))
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(errorMessage(caught, '부가서비스 목록을 불러오지 못했습니다.'))
      })

    // 비활성 요금제는 공개 조회가 실패합니다. 이때는 빈 목록에서 시작하고 그 사실을 알립니다.
    adminPlanIncludedAddonApi
      .getIncludedAddonList(productId)
      .then((included) => {
        if (!cancelled) setSelected(new Set(included.map((addon) => addon.addonServiceId)))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            '현재 포함된 부가서비스를 불러오지 못했습니다. 비활성 요금제는 조회할 수 없으니, 저장하면 아래에서 고른 목록으로 바뀝니다.',
          )
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  function toggle(addonServiceId: number, checked: boolean) {
    setSaved(false)
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(addonServiceId)
      else next.delete(addonServiceId)
      return next
    })
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selected.size > MAX_INCLUDED_ADDONS) {
      setError(`포함 부가서비스는 ${MAX_INCLUDED_ADDONS}개까지 고를 수 있습니다.`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const next = await adminPlanIncludedAddonApi.replaceIncludedAddons(productId, {
        addonServiceIds: [...selected],
      })
      setSelected(new Set(next.map((addon) => addon.addonServiceId)))
      setSaved(true)
    } catch (caught) {
      setError(errorMessage(caught, '포함 부가서비스를 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form
        ref={modalFocusRef}
        aria-labelledby="plan-included-addon-title"
        aria-modal="true"
        className="faq-modal admin-product-form"
        onSubmit={(event) => void save(event)}
        role="dialog"
      >
        <h2 id="plan-included-addon-title">포함 부가서비스</h2>
        <p>
          <strong>{productName}</strong>에 기본으로 포함할 부가서비스를 고릅니다. 이 요금제로
          가입하거나 바꾸는 회선에 0원으로 함께 가입되며, 사용자가 따로 해지할 수 없습니다.
        </p>

        {loadError ? (
          <p className="login-error">{loadError}</p>
        ) : addons === null ? (
          <p>부가서비스 목록을 불러오는 중입니다.</p>
        ) : addons.length === 0 ? (
          <p>등록된 부가서비스가 없습니다.</p>
        ) : (
          <fieldset className="admin-product-options">
            <legend>
              부가서비스 ({selected.size}/{MAX_INCLUDED_ADDONS})
            </legend>
            {addons.map((addon) => (
              <label key={addon.addonServiceId}>
                <input
                  checked={selected.has(addon.addonServiceId)}
                  onChange={(event) => toggle(addon.addonServiceId, event.target.checked)}
                  type="checkbox"
                />
                {addon.name} · {ADDON_CATEGORY_LABELS[addon.category]} ·{' '}
                {formatWon(addon.monthlyFee)}
              </label>
            ))}
          </fieldset>
        )}

        {error && <p className="login-error">{error}</p>}
        {saved && !error && <p className="admin-product-form__hint">저장했습니다.</p>}

        <div className="faq-modal__actions">
          <button className="secondary-button" disabled={saving} onClick={onClose} type="button">
            닫기
          </button>
          <button
            className="primary-button"
            disabled={saving || addons === null || loadError !== null}
            type="submit"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
