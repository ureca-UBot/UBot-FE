interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  showEdgeButtons?: boolean
  showSinglePage?: boolean
}

export function Pagination({
  page,
  totalPages,
  onChange,
  showEdgeButtons = false,
  showSinglePage = false,
}: PaginationProps) {
  if (totalPages <= 1 && !showSinglePage) return null

  const pageCount = Math.max(totalPages, 1)
  const start = Math.floor(page / 10) * 10
  const end = Math.min(start + 10, pageCount)

  return (
    <div className="pagination">
      {showEdgeButtons && (
        <button disabled={page === 0} onClick={() => onChange(0)} type="button">
          맨 앞
        </button>
      )}
      <button
        disabled={start === 0}
        onClick={() => onChange(Math.max(start - 10, 0))}
        type="button"
      >
        이전
      </button>
      {Array.from({ length: end - start }, (_, index) => start + index).map((item) => (
        <button
          className={page === item ? 'pagination__active' : ''}
          key={item}
          onClick={() => onChange(item)}
          type="button"
        >
          {item + 1}
        </button>
      ))}
      <button
        disabled={end === pageCount}
        onClick={() => onChange(Math.min(start + 10, pageCount - 1))}
        type="button"
      >
        다음
      </button>
      {showEdgeButtons && (
        <button
          disabled={page === pageCount - 1}
          onClick={() => onChange(pageCount - 1)}
          type="button"
        >
          맨 뒤
        </button>
      )}
    </div>
  )
}
