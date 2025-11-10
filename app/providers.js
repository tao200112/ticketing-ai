'use client';

import NavbarPartyTix from '../components/NavbarPartyTix';
import { DesktopVersionDisplay, MobileVersionDisplay } from '../components/VersionDisplay';
import { AuthProvider } from '../lib/auth-context';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <NavbarPartyTix />
      <main style={{ paddingTop: '80px' }}>
        {children}
      </main>
      <div className="hidden md:block">
        <DesktopVersionDisplay />
      </div>
      <div className="block md:hidden">
        <MobileVersionDisplay />
      </div>
    </AuthProvider>
  );
}
