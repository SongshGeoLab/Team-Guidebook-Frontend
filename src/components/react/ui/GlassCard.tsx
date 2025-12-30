import type { ReactNode } from 'react';
import clsx from 'clsx';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white/5 border border-white/10 backdrop-blur-md shadow-lg',
        'transition-all duration-300',
        onClick && 'cursor-pointer hover:border-teal-300/50 hover:shadow-[0_0_20px_-5px_rgba(20,184,166,0.2)]',
        className
      )}
    >
      {children}
    </div>
  );
}

