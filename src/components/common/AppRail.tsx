'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function AppRail() {
  const pathname = usePathname();
  const onExplore = pathname.startsWith('/explore');

  return (
    <nav
      className="rail key sticky top-6 sm:top-7 self-start h-[calc(100vh-48px)] sm:h-[calc(100vh-56px)]"
      aria-label="Sections"
    >
      {/* Brand mark: a double helix */}
      <div className="grid place-items-center w-9 h-9 mb-2 text-on-key" title="Musical DNA Visualizer">
        <svg {...iconProps}>
          <path d="M7 3c0 6 10 6 10 12 0 2.5-1.5 4.5-3 6" />
          <path d="M17 3c0 6-10 6-10 12 0 2.5 1.5 4.5 3 6" />
          <path d="M9 6h6M9 18h6" />
        </svg>
      </div>

      <Link href="/" aria-current={onExplore ? undefined : 'page'} aria-label="Library" title="Library">
        <svg {...iconProps}>
          <path d="M3 10v4M7.5 6v12M12 3v18M16.5 8v8M21 10v4" />
        </svg>
      </Link>

      <Link href="/explore" aria-current={onExplore ? 'page' : undefined} aria-label="Similarity explorer" title="Similarity explorer">
        <svg {...iconProps}>
          <circle cx="5" cy="6" r="2" />
          <circle cx="19" cy="8" r="2" />
          <circle cx="11" cy="18" r="2" />
          <path d="M7 6.3l10 1.4M17.8 9.6l-5.6 6.8M6 7.8l4 8.5" />
        </svg>
      </Link>
    </nav>
  );
}
