'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { slideUp, staggerItem } from '@/lib/motion';

/** Fades and slides its content up when it scrolls into view (once). */
export function Reveal({
  children,
  className,
  index,
}: {
  children: ReactNode;
  className?: string;
  /** Give list items their position so they appear one after another. */
  index?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={index === undefined ? slideUp : staggerItem}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
    >
      {children}
    </motion.div>
  );
}
