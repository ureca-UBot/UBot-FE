import { StoreDeleteModal } from '../../store/components/StoreDeleteModal'
import { StoreDetailModal } from '../../store/components/StoreDetailModal'
import { StoreFormModal } from '../../store/components/StoreFormModal'
import { StorePagination } from '../../store/components/StorePagination'
import { StoreTable } from '../../store/components/StoreTable'
import { useStoreManagement } from '../../store/hooks/useStoreManagement'
import { serviceFilters } from '../../store/utils/listFilters'

export function StoreListPage() {
  const {
    mode,
    setFormStore,
    changeMode,
    submitSearch,
    changeSido,
    sido,
    sidos,
    setSigungu,
    setPage,
    sigungu,
    sigungus,
    setStoreNameInput,
    storeNameInput,
    setPhoneNumberInput,
    phoneNumberInput,
    serviceFilterRef,
    serviceOpen,
    setServiceOpen,
    serviceSummary,
    serviceCodes,
    toggleService,
    resetFilters,
    error,
    loading,
    result,
    restoreStore,
    setDeleteStore,
    setDetailStoreId,
    openEdit,
    restoringStoreId,
    page,
    detailStoreId,
    formStore,
    setRevision,
    deleteStore,
  } = useStoreManagement()
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>매장 관리</h1>
          <p>
            {mode === 'active'
              ? '매장 정보를 조회하고 등록·수정·삭제합니다.'
              : '소프트 삭제된 매장을 조회하고 다시 활성화할 수 있습니다.'}
          </p>
        </div>
        {mode === 'active' && (
          <button className="primary-button" onClick={() => setFormStore(null)} type="button">
            매장 등록
          </button>
        )}
      </div>

      <div className="admin-store-tabs" role="tablist" aria-label="매장 상태">
        <button
          aria-selected={mode === 'active'}
          className={
            mode === 'active' ? 'admin-store-tab admin-store-tab--active' : 'admin-store-tab'
          }
          onClick={() => changeMode('active')}
          role="tab"
          type="button"
        >
          활성 매장
        </button>
        <button
          aria-selected={mode === 'deleted'}
          className={
            mode === 'deleted' ? 'admin-store-tab admin-store-tab--active' : 'admin-store-tab'
          }
          onClick={() => changeMode('deleted')}
          role="tab"
          type="button"
        >
          삭제된 매장
        </button>
      </div>

      <form className="faq-search admin-store-search" onSubmit={submitSearch}>
        <select
          aria-label="시도 선택"
          onChange={(event) => changeSido(event.target.value)}
          value={sido}
        >
          <option value="">전체 시/도</option>
          {sidos.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          aria-label="시군구 선택"
          disabled={!sido}
          onChange={(event) => {
            setSigungu(event.target.value)
            setPage(0)
          }}
          value={sigungu}
        >
          <option value="">전체 시/군/구</option>
          {sigungus.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <input
          aria-label="매장명 검색"
          maxLength={150}
          onChange={(event) => setStoreNameInput(event.target.value)}
          placeholder="매장명"
          value={storeNameInput}
        />

        <input
          aria-label="연락처 검색"
          maxLength={30}
          onChange={(event) => setPhoneNumberInput(event.target.value)}
          placeholder="연락처"
          value={phoneNumberInput}
        />

        <div className="admin-store-service-filter" ref={serviceFilterRef}>
          <button
            aria-expanded={serviceOpen}
            className="admin-store-service-toggle"
            onClick={() => setServiceOpen((current) => !current)}
            type="button"
          >
            <span>{serviceSummary}</span>
            <i aria-hidden="true">⌄</i>
          </button>

          {serviceOpen && (
            <div className="admin-store-service-options">
              {serviceFilters.map(([code, name]) => (
                <label key={code}>
                  <input
                    checked={serviceCodes.includes(code)}
                    onChange={() => toggleService(code)}
                    type="checkbox"
                  />
                  <span>
                    {name}
                    {serviceCodes.includes(code) && <b aria-hidden="true">✓</b>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button className="primary-button" type="submit">
          검색
        </button>
        <button className="secondary-button" onClick={resetFilters} type="button">
          초기화
        </button>
      </form>

      {error && <p className="login-error">{error}</p>}

      {loading ? (
        <p className="page-message">
          {mode === 'active'
            ? '매장 목록을 불러오는 중입니다.'
            : '삭제된 매장 목록을 불러오는 중입니다.'}
        </p>
      ) : (
        <>
          <p className="faq-result-count">
            {mode === 'active' ? '활성 매장' : '삭제된 매장'} 총 {result?.totalElements ?? 0}개
          </p>
          <StoreTable
            mode={mode}
            onActivate={(store) => void restoreStore(store)}
            onDelete={setDeleteStore}
            onDetail={setDetailStoreId}
            onEdit={(storeId) => void openEdit(storeId)}
            restoringStoreId={restoringStoreId}
            stores={result?.content ?? []}
          />
          {result && (
            <StorePagination onChange={setPage} page={page} totalPages={result.totalPages} />
          )}
        </>
      )}

      {mode === 'active' && detailStoreId && (
        <StoreDetailModal onClose={() => setDetailStoreId(null)} storeId={detailStoreId} />
      )}

      {mode === 'active' && formStore !== undefined && (
        <StoreFormModal
          onClose={() => setFormStore(undefined)}
          onSaved={() => setRevision((current) => current + 1)}
          store={formStore}
        />
      )}

      {mode === 'active' && deleteStore && (
        <StoreDeleteModal
          onClose={() => setDeleteStore(null)}
          onDeleted={() => setRevision((current) => current + 1)}
          store={deleteStore}
        />
      )}
    </section>
  )
}
