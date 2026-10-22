import { useFaqDetail } from './useFaqDetail'
import { useFaqImprovements } from './useFaqImprovements'
import { useFaqMonitoring } from './useFaqMonitoring'
export function useFaqDashboard() {
  const monitoring = useFaqMonitoring()
  const detail = useFaqDetail()
  const improvements = useFaqImprovements()
  return { ...monitoring, ...detail, ...improvements }
}
