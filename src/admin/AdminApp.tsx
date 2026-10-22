import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { EmbeddingBackfillProvider } from './embedding/context/EmbeddingBackfillProvider'
import { AdminLayout } from './layout/AdminLayout'
import { EmbeddingBackfillPage } from './pages/embedding/EmbeddingBackfillPage'
import { DeletedFaqListPage } from './pages/faq/DeletedFaqListPage'
import { FaqCategoryListPage } from './pages/faq/FaqCategoryListPage'
import { FaqDetailPage } from './pages/faq/FaqDetailPage'
import { FaqLayout } from './pages/faq/FaqLayout'
import { FaqListPage } from './pages/faq/FaqListPage'
import {
  FaqImprovementExclusionHistoryPage,
  FaqImprovementExclusionListPage,
} from './pages/faq/FaqImprovementExclusionPages'
import { ForbiddenWordListPage } from './pages/forbidden-word/ForbiddenWordListPage'
import { GuestChatSettingsPage } from './pages/guest-chat/GuestChatSettingsPage'
import { InquiryListPage } from './pages/inquiry/InquiryListPage'
import { NoticeListPage } from './pages/notice/NoticeListPage'
import { ProductLayout } from './pages/product/ProductLayout'
import { ProductListPage } from './pages/product/ProductListPage'
import { ReservationListPage } from './pages/reservation/ReservationListPage'
import { StoreListPage } from './pages/store/StoreListPage'
import { UnansweredGroupListPage } from './pages/unanswered/UnansweredGroupListPage'
import { addonServiceKind } from './product/kinds/addonServiceKind'
import { bundleProductKind } from './product/kinds/bundleProductKind'
import { planKind } from './product/kinds/planKind'
import { roamingProductKind } from './product/kinds/roamingProductKind'

const DashboardPage = lazy(() =>
  import('./pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const OperationDashboardPage = lazy(() =>
  import('./operation/pages/OperationDashboardPage').then((module) => ({
    default: module.OperationDashboardPage,
  })),
)

const SafetyMonitorPage = lazy(() =>
  import('../counsel/pages/SafetyMonitorPage').then((module) => ({
    default: module.SafetyMonitorPage,
  })),
)
const SafetySentencesPage = lazy(() =>
  import('../counsel/pages/SafetySentencesPage').then((module) => ({
    default: module.SafetySentencesPage,
  })),
)

export default function AdminApp() {
  return (
    <Routes>
      <Route
        element={
          <EmbeddingBackfillProvider>
            <AdminLayout />
          </EmbeddingBackfillProvider>
        }
      >
        <Route index element={<Navigate replace to="dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="operation" element={<OperationDashboardPage />} />
        <Route path="counsel-safety" element={<SafetyMonitorPage />} />
        <Route path="counsel-sentences" element={<SafetySentencesPage />} />

        <Route path="faqs" element={<FaqLayout />}>
          <Route index element={<FaqListPage />} />
          <Route path="deleted" element={<DeletedFaqListPage />} />
          <Route path="categories" element={<FaqCategoryListPage />} />
          <Route path="improvement-exclusions" element={<FaqImprovementExclusionListPage />} />
          <Route
            path="improvement-exclusions/history"
            element={<FaqImprovementExclusionHistoryPage />}
          />
          <Route path=":faqId" element={<FaqDetailPage />} />
        </Route>
        {/* 4종이 같은 화면을 쓰므로 key를 달리해, 탭을 옮길 때 검색 조건과 목록을 새로 시작합니다. */}
        <Route path="products" element={<ProductLayout />}>
          <Route index element={<Navigate replace to="plans" />} />
          <Route path="plans" element={<ProductListPage key="plans" kind={planKind} />} />
          <Route
            path="bundle-products"
            element={<ProductListPage key="bundle-products" kind={bundleProductKind} />}
          />
          <Route
            path="addon-services"
            element={<ProductListPage key="addon-services" kind={addonServiceKind} />}
          />
          <Route
            path="roaming-products"
            element={<ProductListPage key="roaming-products" kind={roamingProductKind} />}
          />
        </Route>
        <Route path="stores" element={<StoreListPage />} />
        <Route path="forbidden-words" element={<ForbiddenWordListPage />} />
        <Route path="unanswered-groups" element={<UnansweredGroupListPage />} />
        <Route path="reservations" element={<ReservationListPage />} />
        <Route path="notices" element={<NoticeListPage />} />
        <Route path="inquiries" element={<InquiryListPage />} />
        <Route path="guest-chat-settings" element={<GuestChatSettingsPage />} />
        <Route path="embedding-backfill" element={<EmbeddingBackfillPage />} />

        <Route path="*" element={<Navigate replace to="dashboard" />} />
      </Route>
    </Routes>
  )
}
