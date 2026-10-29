import type { Transition, Variants } from 'motion/react';

// Motion presets (docs/11-DESIGN-SYSTEM.md section 10). Short and calm; only transform and opacity.
// The app is wrapped in <MotionConfig reducedMotion="user">, so people who ask for less motion get simple fades.
export const ease = [0.16, 1, 0.3, 1] as const;

export const t = {
  fast: { duration: 0.15, ease } satisfies Transition,
  base: { duration: 0.2, ease } satisfies Transition,
  slow: { duration: 0.3, ease } satisfies Transition,
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: t.base },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: t.base },
};

/** Children appear one after another (40 ms apart, only the first 10). Pass `custom={index}`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...t.slow, delay: Math.min(index, 9) * 0.04 },
  }),
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: t.base },
};

/** A slip being pinned to the board: drops in a little and settles at its tilt. */
export const pinDrop: Variants = {
  hidden: { opacity: 0, y: -14, scale: 0.97 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease, delay: 0.15 + index * 0.12 },
  }),
};

export const pop = { scale: [1, 1.25, 1], transition: { duration: 0.25 } };
export const press = { scale: 0.97 };
