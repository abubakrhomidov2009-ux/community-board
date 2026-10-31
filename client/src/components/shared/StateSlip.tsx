import type { ReactNode } from 'react';

/** Empty and error states: a slip with an icon, a line and (maybe) one action. */
export function StateSlip({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="relative mx-auto flex w-full max-w-[460px] flex-col items-center gap-3 rounded-[8px_8px_24px_24px] border border-border bg-paper px-6 py-10 text-center animate-in fade-in duration-300 motion-reduce:animate-none"
    >
      <span
        aria-hidden="true"
        className="pin-dot absolute -top-[11px] left-1/2 -ml-[11px] size-[22px] rounded-full"
      />
      <span className="text-body-2">{icon}</span>
      <h2 className="m-0 font-display text-xl font-bold tracking-[-0.5px]">{title}</h2>
      <p className="m-0 text-base text-body">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
