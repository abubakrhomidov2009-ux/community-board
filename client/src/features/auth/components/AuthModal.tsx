'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useRef, type ComponentType, type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { useMediaQuery } from '@/lib/use-media-query';
import { AuthSlip, type AuthMode } from './AuthSlip';

type TitleComponent = ComponentType<{ id?: string; className?: string; children?: ReactNode }>;

interface AuthModalProps {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * The Log in / Create account modal. On a laptop it is a slip in the middle of the screen (a little tilted);
 * on a phone it is a bottom sheet you can drag down. Both trap the focus and close with Esc.
 */
export function AuthModal({ open, mode, onModeChange, onOpenChange, onSuccess }: AuthModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const slip = (Title: TitleComponent) => (
    <AuthSlip
      mode={mode}
      onModeChange={onModeChange}
      onClose={() => onOpenChange(false)}
      onSuccess={onSuccess}
      Title={Title}
      firstInputRef={firstInputRef}
    />
  );

  if (isDesktop) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-overlay transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <Dialog.Popup
              initialFocus={(type) => (type === 'touch' ? false : firstInputRef.current)}
              className="w-[460px] max-w-full outline-none transition-[opacity,transform] duration-200 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
            >
              <div className="-rotate-1">{slip(Dialog.Title as TitleComponent)}</div>
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Drawer.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            // On a phone, do not pop the keyboard up before the person has seen the form.
            event.preventDefault();
          }}
          className="fixed inset-x-2.5 bottom-4 z-50 max-h-[calc(100dvh-24px)] overflow-y-auto pt-3 outline-none"
        >
          {slip(Drawer.Title as TitleComponent)}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
