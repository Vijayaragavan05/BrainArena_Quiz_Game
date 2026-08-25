import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover = false, className = '', children, ...rest }: CardProps) {
  return (
    <div className={`card-surface ${hover ? 'card-hover' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}