export function StorePagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  const start = Math.floor(page / 10) * 10
  const end = Math.min(start + 10, totalPages)
  return <div className="pagination"><button disabled={start === 0} onClick={() => onChange(Math.max(start - 10, 0))} type="button">이전</button>{Array.from({ length: end - start }, (_, index) => start + index).map((item) => <button className={page === item ? 'pagination__active' : ''} key={item} onClick={() => onChange(item)} type="button">{item + 1}</button>)}<button disabled={end === totalPages} onClick={() => onChange(Math.min(start + 10, totalPages - 1))} type="button">다음</button></div>
}
