import {
  useCallback,
  useEffect,
  useState,
} from 'react';

const HERO_COUNT = 3;
const AUTO_PLAY_INTERVAL = 5800;

export function useHeroCarousel() {
  const [heroIndex, setHeroIndex] =
    useState(0);

  const previous = useCallback(() => {
    setHeroIndex(
      (current) =>
        (
          current
          + HERO_COUNT
          - 1
        ) % HERO_COUNT,
    );
  }, []);

  const next = useCallback(() => {
    setHeroIndex(
      (current) =>
        (current + 1) % HERO_COUNT,
    );
  }, []);

  const goTo = useCallback(
    (
      index: number,
    ) => {
      if (
        index < 0
        || index >= HERO_COUNT
      ) {
        return;
      }

      setHeroIndex(index);
    },
    [],
  );

  useEffect(() => {
    const reduceMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

    if (reduceMotion) {
      return;
    }

    const timer = window.setInterval(
      () => {
        setHeroIndex(
          (current) =>
            (current + 1)
            % HERO_COUNT,
        );
      },
      AUTO_PLAY_INTERVAL,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return {
    heroIndex,
    previous,
    next,
    goTo,
  };
}
