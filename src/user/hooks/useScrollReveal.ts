import { useEffect } from 'react'

const REVEAL_SELECTOR =
  '.home-quick-services, .intro-block, .story, .phone-product, .benefit-item, .network-detail'

export function useScrollReveal() {
  useEffect(() => {
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue
                entry.target.classList.add('is-visible')
                observer?.unobserve(entry.target)
              }
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px' },
          )
        : null
    const observe = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element) => {
        // StrictMode에서 effect가 다시 연결되면 아직 표시되지 않은 요소를 다시 관찰합니다.
        if (element.classList.contains('is-visible')) return
        element.classList.add('reveal-on-scroll')
        if (observer) observer.observe(element)
        else element.classList.add('is-visible')
      })
    }
    observe(document)
    // 처음 방문하여 추가된 페이지에도 같은 애니메이션을 적용합니다.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        if (record.addedNodes.length)
          observe(record.target instanceof Element ? record.target : document)
      }
    })
    mutations.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer?.disconnect()
      mutations.disconnect()
    }
  }, [])
}
