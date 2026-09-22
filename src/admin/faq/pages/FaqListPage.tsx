import { useEffect, useState } from 'react'
import { getFaqList } from '../api/faqApi'
import { FaqTable } from '../components/FaqTable'
import type { FaqResponse } from '../types/faq'

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

export function FaqListPage() {
  const [faqs, setFaqs] = useState<FaqResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadFaqs() {
      try {
        const pageResponse = await getFaqList()
        setFaqs(pageResponse.content)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'FAQ 목록을 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadFaqs()
  }, [])

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>FAQ 관리</h1>
          <p>서비스에 표시되는 FAQ를 조회하고 관리합니다.</p>
        </div>
        <button className="primary-button" type="button">FAQ 등록</button>
      </div>
      {isLoading && <p className="page-message">FAQ 목록을 불러오는 중입니다.</p>}
      {errorMessage && <p className="page-message page-message--error">{errorMessage}</p>}
      {!isLoading && !errorMessage && (
        <FaqTable
          faqs={faqs.map((faq) => ({
            ...faq,
            updatedAt: formatDate(faq.updatedAt),
          }))}
        />
      )}
    </section>
  )
}
