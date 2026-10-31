'use client';

import { motion } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import { PostSlip } from '@/components/shared/PostSlip';
import { useToggleFavorite } from '@/features/favorites/mutations';
import { staggerItem } from '@/lib/motion';
import type { Post } from '../api';
import { toSlip, type Translate } from '../format';

// A small, steady tilt for each slip so the board looks pinned by hand (under 1 degree).
const TILTS = [-0.6, 0.5, -0.3, 0.4, -0.5, 0.3];

/** The grid of slips used by the board, Saved, My profile and other people's profiles. */
export function SlipGrid({ posts, className }: { posts: Post[]; className?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const favorite = useToggleFavorite();
  const translate: Translate = (key, values) => t(key as never, values as never);

  return (
    <div
      className={
        className ??
        'grid grid-cols-1 gap-x-7 gap-y-10 pt-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }
    >
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          variants={staggerItem}
          custom={index % 12}
          initial="hidden"
          animate="visible"
        >
          <PostSlip
            interactive
            item={{ ...toSlip(post, translate, locale), tilt: TILTS[index % TILTS.length] }}
            onToggleSave={() => favorite.mutate({ id: post.id, save: !post.isFavorite })}
          />
        </motion.div>
      ))}
    </div>
  );
}
