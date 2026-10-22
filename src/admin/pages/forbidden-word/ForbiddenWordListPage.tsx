import { ForbiddenWordEditModal } from '../../forbidden-word/components/ForbiddenWordEditModal'
import { ForbiddenWordPagination } from '../../forbidden-word/components/ForbiddenWordPagination'
import { ForbiddenWordTable } from '../../forbidden-word/components/ForbiddenWordTable'
import { useForbiddenWords } from '../../forbidden-word/hooks/useForbiddenWords'
import {
  FORBIDDEN_WORD_PAGE_SIZES,
  type ForbiddenWordPageSize,
} from '../../forbidden-word/types/forbiddenWord'

export function ForbiddenWordListPage() {
  const {
    create,
    setNewWord,
    newWord,
    creating,
    createError,
    result,
    setSize,
    setPage,
    size,
    error,
    loading,
    setEditing,
    toggleStatus,
    togglingId,
    page,
    editing,
    reload,
  } = useForbiddenWords()
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>금지어 관리</h1>
          <p>
            활성 금지어가 포함된 채팅 질문은 답변 생성 전에 차단됩니다. 사용하지 않을 금지어는
            비활성화합니다.
          </p>
        </div>
      </div>

      <form className="faq-search" onSubmit={(event) => void create(event)}>
        <input
          aria-label="새 금지어"
          maxLength={100}
          onChange={(event) => setNewWord(event.target.value)}
          placeholder="새 금지어 입력"
          value={newWord}
        />
        <button className="primary-button" disabled={creating} type="submit">
          {creating ? '등록 중...' : '금지어 등록'}
        </button>
      </form>
      {createError && <p className="login-error forbidden-word-message">{createError}</p>}

      <div className="forbidden-word-toolbar">
        <span className="faq-result-count">전체 {result?.totalElements ?? 0}개</span>
        <label>
          페이지당
          <select
            onChange={(event) => {
              setSize(Number(event.target.value) as ForbiddenWordPageSize)
              setPage(0)
            }}
            value={size}
          >
            {FORBIDDEN_WORD_PAGE_SIZES.map((option) => (
              <option key={option} value={option}>
                {option}개
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="page-message page-message--error forbidden-word-message">{error}</p>}

      {loading && !result ? (
        <p className="page-message">금지어 목록을 불러오는 중입니다.</p>
      ) : (
        result && (
          <>
            <ForbiddenWordTable
              forbiddenWords={result.content}
              onEdit={setEditing}
              onToggleStatus={(forbiddenWord) => void toggleStatus(forbiddenWord)}
              togglingId={togglingId}
            />
            <ForbiddenWordPagination
              onChange={setPage}
              page={page}
              totalPages={result.totalPages}
            />
          </>
        )
      )}

      {editing && (
        <ForbiddenWordEditModal
          forbiddenWord={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </section>
  )
}
