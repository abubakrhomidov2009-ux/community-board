'use client';

import { motion } from 'motion/react';
import { PostSlip, type SlipData } from '@/components/shared/PostSlip';
import { pinDrop } from '@/lib/motion';
import { cn } from '@/lib/utils';

/** A slip that drops onto the board when the page opens, one after another. */
export function PinnedSlip({
  item,
  index,
  className,
}: {
  item: SlipData;
  index: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={pinDrop}
      custom={index}
      initial="hidden"
      animate="visible"
      className={cn('absolute', className)}
    >
      <PostSlip item={item} />
    </motion.div>
  );
}
