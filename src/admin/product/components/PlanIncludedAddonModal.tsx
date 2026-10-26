import { useEffect, useState, type FormEvent } from 'react'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import { ADDON_CATEGORY_LABELS, formatWon } from '../../../shared/product/format'
import type { AddonCategory, AddonService } from '../../../shared/product/types'
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
  const [included, setIncluded] = useState<AddonService[] | null>(null)
  const [category, setCategory] = useState<AddonCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadAddons() {
      const params = { keyword: '', status: null, deleted: false, page: 0, size: 100 }
      const first = await adminAddonServiceApi.getProductList(params)
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
          adminAddonServiceApi.getProductList({ ...params, page: index + 1 }),
        ),
      )
      return [first, ...rest].flatMap((page) => page.content.map((product) => product.detail))
    }
    loadAddons()
      .then((items) => {
        if (!cancelled) setAddons(items)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(errorMessage(caught, '부가서비스 목록을 불러오지 못했습니다.'))
      })

    // 비활성 요금제는 공개 조회가 실패합니다. 이때는 빈 목록에서 시작하고 그 사실을 알립니다.
    adminPlanIncludedAddonApi
      .getIncludedAddonList(productId)
      .then((included) => {
        if (!cancelled) {
          setIncluded(included)
          setSelected(new Set(included.map((addon) => addon.addonServiceId)))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIncluded([])
          setError(
            '현재 포함된 부가서비스를 불러오지 못했습니다. 비활성 요금제는 조회할 수 없으니, 저장하면 아래에서 고른 목록으로 바뀝니다.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  function toggle(addonServiceId: number, checked: boolean) {
    if (checked && selected.size >= MAX_INCLUDED_ADDONS) return
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
      setIncluded(next)
      setSaved(true)
    } catch (caught) {
      setError(errorMessage(caught, '포함 부가서비스를 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const catalog = [
    ...new Map(
      [...(addons ?? []), ...(included ?? [])].map((addon) => [addon.addonServiceId, addon]),
    ).values(),
  ]
  const keyword = query.trim().toLocaleLowerCase()
  const available = catalog.filter((addon) => !selected.has(addon.addonServiceId))
  const visible = available.filter(
    (addon) =>
      (category === 'all' || addon.category === category) &&
      `${addon.name} ${addon.code}`.toLocaleLowerCase().includes(keyword),
  )
  const chosen = catalog.filter((addon) => selected.has(addon.addonServiceId))
  return (
    <div className="modal-backdrop">
      <form
        ref={modalFocusRef}
        aria-labelledby="plan-included-addon-title"
        aria-modal="true"
        className="faq-modal admin-product-form admin-included-addons"
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
          <fieldset className="addon-selection-workspace" disabled={saving || included === null}>
            <legend className="sr-only">포함 부가서비스 선택</legend>
            <section className="addon-catalog" aria-label="추가할 부가서비스">
              <header>
                <h3>부가서비스 목록</h3>
                <span>{available.length}개</span>
              </header>
              <input
                type="search"
                aria-label="부가서비스 검색"
                placeholder="이름 또는 상품 코드 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="addon-category-tabs" role="group" aria-label="부가서비스 카테고리">
                <button
                  type="button"
                  aria-pressed={category === 'all'}
                  onClick={() => setCategory('all')}
                >
                  전체
                </button>
                {(Object.keys(ADDON_CATEGORY_LABELS) as AddonCategory[]).map((key) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={category === key}
                    onClick={() => setCategory(key)}
                  >
                    {ADDON_CATEGORY_LABELS[key]}
                  </button>
                ))}
              </div>
              <ul className="addon-selection-list">
                {visible.map((addon) => (
                  <li key={addon.addonServiceId}>
                    <div>
                      <b>{addon.name}</b>
                      <span>
                        {ADDON_CATEGORY_LABELS[addon.category]} · 월 {formatWon(addon.monthlyFee)}
                      </span>
                    </div>
                    <button
                      className="secondary-button"
                      type="button"
                      aria-label={`${addon.name} 추가`}
                      disabled={selected.size >= MAX_INCLUDED_ADDONS}
                      onClick={() => toggle(addon.addonServiceId, true)}
                    >
                      추가
                    </button>
                  </li>
                ))}
              </ul>
              {visible.length === 0 && (
                <p className="addon-selection-empty">
                  {keyword
                    ? '검색 조건에 맞는 부가서비스가 없습니다.'
                    : '이 카테고리에서 추가할 부가서비스가 없습니다.'}
                </p>
              )}
            </section>
            <section className="addon-selected" aria-label="포함된 부가서비스">
              <header>
                <h3>포함된 부가서비스</h3>
                <span aria-live="polite">
                  {selected.size}/{MAX_INCLUDED_ADDONS}개
                </span>
              </header>
              <p>추가한 서비스는 이 목록에 모입니다. 저장하면 요금제에 반영됩니다.</p>
              <ul className="addon-selection-list">
                {chosen.map((addon) => (
                  <li key={addon.addonServiceId}>
                    <div>
                      <b>{addon.name}</b>
                      <span>{ADDON_CATEGORY_LABELS[addon.category]} · 기본 포함 0원</span>
                    </div>
                    <button
                      className="secondary-button"
                      type="button"
                      aria-label={`${addon.name} 제외`}
                      onClick={() => toggle(addon.addonServiceId, false)}
                    >
                      제외
                    </button>
                  </li>
                ))}
              </ul>
              {selected.size === 0 && (
                <p className="addon-selection-empty">
                  포함된 부가서비스가 없습니다.
                  <br />
                  왼쪽 목록에서 추가해 주세요.
                </p>
              )}
              {selected.size >= MAX_INCLUDED_ADDONS && (
                <p className="addon-selection-empty" role="status">
                  최대 {MAX_INCLUDED_ADDONS}개까지 포함할 수 있습니다.
                </p>
              )}
            </section>
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
            disabled={saving || addons === null || included === null || loadError !== null}
            type="submit"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
