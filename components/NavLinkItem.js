'use client';

import Link from 'next/link';

/**
 * NavLinkItem - Client Component for interactive navigation links
 * 
 * This component wraps Next.js Link to allow event handlers (onClick, onMouseEnter, onMouseLeave)
 * to be passed safely from Server Components or other Client Components.
 * 
 * @param {string} href - The URL to navigate to
 * @param {React.ReactNode} children - The content to display inside the link
 * @param {string} className - Optional CSS class name
 * @param {React.CSSProperties} style - Optional inline styles
 * @param {Function} onClick - Optional click handler
 * @param {Function} onMouseEnter - Optional mouse enter handler
 * @param {Function} onMouseLeave - Optional mouse leave handler
 */
export default function NavLinkItem({
  href,
  children,
  className,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Link>
  );
}
