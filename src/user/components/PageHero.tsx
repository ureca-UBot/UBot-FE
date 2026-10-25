import type { ReactNode } from 'react'
import { pageHeroArtwork, type PageHeroKind } from './pageHeroArtwork'

interface PageHeroProps {
  image: PageHeroKind
  eyebrow: string
  description: string
  children: ReactNode
}

export function PageHero({ image, eyebrow, description, children }: PageHeroProps) {
  return (
    <div className="standard-hero page-hero" data-hero={image}>
      <div className="page-hero-inner">
        <div className="page-hero-copy">
          <span className="page-hero-eyebrow">{eyebrow}</span>
          <h1>{children}</h1>
          <p>{description}</p>
        </div>
        <div className="page-hero-art" aria-hidden="true">
          <img alt="" decoding="async" height={600} src={pageHeroArtwork[image]} width={900} />
        </div>
      </div>
    </div>
  )
}
