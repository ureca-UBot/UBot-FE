import { useLayoutEffect, useRef } from 'react'
import { productArtwork, type ProductArtworkKey } from '../artwork'
import { ProductName } from './ProductName'

interface ProductCardCoverProps {
  artwork: ProductArtworkKey
  name: string
  feature?: { label: string; value: string }
}

export function ProductCardCover({ artwork, name, feature }: ProductCardCoverProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const { src, label } = productArtwork[artwork]
  const showFeature = feature && !/\d+(?:\.\d+)?\s*(?:[KMGT]B|[GM]bps)/i.test(name)

  useLayoutEffect(() => {
    const title = titleRef.current
    if (!title) return
    let mounted = true
    let previousWidth = 0

    // 로고 다음 제목은 한 줄로 유지하고, 긴 이름만 가용 너비에 맞춥니다.
    const fitTitle = () => {
      if (!mounted || title.clientWidth === 0) return
      title.style.removeProperty('--product-title-size')
      let fontSize = Number.parseFloat(getComputedStyle(title).fontSize)
      for (let attempt = 0; attempt < 3 && title.scrollWidth > title.clientWidth; attempt += 1) {
        fontSize = (fontSize * (title.clientWidth - 4)) / title.scrollWidth
        title.style.setProperty('--product-title-size', `${fontSize}px`)
      }
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === previousWidth) return
      previousWidth = entry.contentRect.width
      fitTitle()
    })
    observer.observe(title)
    fitTitle()
    const frame = requestAnimationFrame(fitTitle)
    void document.fonts.ready.then(fitTitle)
    document.fonts.addEventListener('loadingdone', fitTitle)

    return () => {
      mounted = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', fitTitle)
    }
  }, [name])

  return (
    <div className="product-card-cover">
      <div
        className={`product-card-cover-art${src.endsWith('.webp') ? ' is-photo' : ''}`}
        aria-hidden="true"
      >
        <img alt="" decoding="async" height={640} loading="lazy" src={src} width={960} />
      </div>
      <div className="product-card-cover-copy">
        <span className="product-card-cover-label">{label}</span>
        <h3 aria-label={name} ref={titleRef}>
          <ProductName name={name} />
        </h3>
        {showFeature && (
          <div className="product-card-feature">
            <span>{feature.label}</span>
            <strong>{feature.value}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
