import { useEffect } from 'react';

const REVEAL_SELECTOR = [
  '.home-quick-services',
  '.intro-block',
  '.story',
  '.phone-product',
  '.benefit-item',
  '.network-detail',
].join(',');

export function useScrollReveal() {
  useEffect(() => {
    const elements =
      Array.from(
        document.querySelectorAll<HTMLElement>(
          REVEAL_SELECTOR,
        ),
      );

    if (!elements.length) {
      return;
    }

    elements.forEach(
      (element) => {
        element.classList.add(
          'reveal-on-scroll',
        );
      },
    );

    if (
      !(
        'IntersectionObserver'
        in window
      )
    ) {
      elements.forEach(
        (element) => {
          element.classList.add(
            'is-visible',
          );
        },
      );

      return;
    }

    const observer =
      new IntersectionObserver(
        (
          entries,
        ) => {
          entries.forEach(
            (
              entry,
            ) => {
              if (
                !entry.isIntersecting
              ) {
                return;
              }

              entry.target.classList.add(
                'is-visible',
              );

              observer.unobserve(
                entry.target,
              );
            },
          );
        },
        {
          threshold: 0.12,
          rootMargin:
            '0px 0px -40px',
        },
      );

    elements.forEach(
      (element) => {
        observer.observe(
          element,
        );
      },
    );

    return () => {
      observer.disconnect();
    };
  }, []);
}
