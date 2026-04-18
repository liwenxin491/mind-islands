import type { ReactNode } from 'react';
import backgroundImage from '../../assets/background-new.png';

export function SceneShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#103542] text-foreground">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(6, 23, 28, 0.34), rgba(8, 34, 41, 0.2)), url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(185,218,224,0.18),transparent_45%)]" />

      <div className="relative z-10 flex h-[100dvh] items-center justify-center px-0 py-0 sm:px-8 sm:py-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[calc(50%-220px)] bg-[#9eb9c0]/20 backdrop-blur-[2px] sm:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[calc(50%-220px)] bg-[#9eb9c0]/20 backdrop-blur-[2px] sm:block" />

        <div className="relative h-full w-full max-w-[420px] overflow-hidden sm:h-[min(92dvh,860px)] sm:rounded-[36px] sm:border sm:border-white/20 sm:shadow-[0_28px_90px_rgba(4,24,30,0.42)]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a2e38]/10 via-transparent to-[#0a2e38]/18" />
          <div className="relative z-10 h-full overflow-y-auto hide-scrollbar">{children}</div>
        </div>
      </div>
    </div>
  );
}
