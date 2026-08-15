import type { ReactNode } from 'react';
import clsx from 'clsx';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /**
   * Makes the whole card a link.
   *
   * This used to be an `onClick` that called `window.location.assign` on a
   * `<div>`. That card could not be reached by keyboard, announced nothing to a
   * screen reader, and had no URL to middle-click or copy. Rendering a real
   * anchor gets focus, Enter, the status-bar preview and open-in-new-tab for
   * free — none of which a click handler can reproduce.
   */
  href?: string;
}

export function GlassCard({ children, className, href }: GlassCardProps) {
  const classes = clsx(
    'bg-white/5 border border-white/10 backdrop-blur-md shadow-lg',
    'transition-all duration-300',
    href &&
      'cursor-pointer hover:border-teal-300/50 hover:shadow-[0_0_20px_-5px_rgba(20,184,166,0.2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300',
    className
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return <div className={classes}>{children}</div>;
}
