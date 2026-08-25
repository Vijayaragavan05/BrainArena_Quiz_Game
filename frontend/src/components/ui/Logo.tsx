import { Link } from 'react-router-dom';

interface LogoProps {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass: Record<string, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function Logo({ to = '/', size = 'md' }: LogoProps) {
  return (
    <Link to={to} className={`font-display font-extrabold tracking-tight ${sizeClass[size]}`}>
      Brain<span className="text-gradient">Arena</span>
    </Link>
  );
}