export function DashboardPage() {
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>관리자 대시보드</h1>
          <p>FAQ와 매장 운영 현황을 관리합니다.</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <article className="dashboard-card"><p className="dashboard-card__label">FAQ 관리</p><p className="dashboard-card__value">바로가기</p></article>
        <article className="dashboard-card"><p className="dashboard-card__label">삭제된 FAQ</p><p className="dashboard-card__value">바로가기</p></article>
        <article className="dashboard-card"><p className="dashboard-card__label">매장 관리</p><p className="dashboard-card__value">준비 중</p></article>
      </div>
    </section>
  )
}
