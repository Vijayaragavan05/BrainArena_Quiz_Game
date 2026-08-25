import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-500 hover:bg-red-900/40 disabled:opacity-45',
};

const sizeClass: Record<string, string> = {
  sm: '!px-3 !py-1.5 !text-xs',
  md: '',
  lg: '!px-7 !py-3.5 !text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...rest }, ref) => (
    <button ref={ref} className={`${variantClass[variant]} ${sizeClass[size]} ${className}`} {...rest}>
      {children}
    </button>
  ),
);
Button.displayName = 'Button';