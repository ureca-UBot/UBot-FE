import { DashboardFilters } from '../../dashboard/components/DashboardFilters'
import { FaqDetailSection } from '../../dashboard/components/FaqDetailSection'
import { FaqImprovements } from '../../dashboard/components/FaqImprovements'
import { FaqRankings } from '../../dashboard/components/FaqRankings'
import { UnansweredSummary } from '../../dashboard/components/UnansweredSummary'
import { useFaqDashboard } from '../../dashboard/hooks/useFaqDashboard'

export function DashboardPage() {
  const dashboard = useFaqDashboard()
  return (
    <section className="faq-dashboard">
      <DashboardFilters {...dashboard} />
      <UnansweredSummary {...dashboard} />
      <FaqRankings {...dashboard} />
      <div className="faq-dashboard-pair faq-dashboard-pair--bottom">
        <FaqDetailSection {...dashboard} />
        <FaqImprovements {...dashboard} />
      </div>
    </section>
  )
}
