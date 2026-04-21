import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const GoogleAd: React.FC = () => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // Basic check to see if the element is available and hasn't been processed
    // AdSense script adds 'data-adsbygoogle-status' after push()
    if (adRef.current && !adRef.current.hasAttribute('data-adsbygoogle-status')) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        // We ignore the "All 'ins' elements... already have ads" error
        // as it's a common benign issue in SPAs during re-renders.
        if (e instanceof Error && !e.message.includes('already have ads')) {
          console.error("AdSense Error:", e);
        }
      }
    }
  }, []);

  return (
    <div className="my-6 overflow-hidden flex justify-center bg-surface/30 rounded-xl border border-border/50 p-4">
      <ins 
           ref={adRef}
           className="adsbygoogle"
           style={{ display: 'block', width: '100%', minWidth: '250px', minHeight: '90px' }}
           data-ad-format="fluid"
           data-ad-layout-key="-f7+5u+4t-da+6l"
           data-ad-client="ca-pub-6157578172256875"
           data-ad-slot="8059175804"></ins>
    </div>
  );
};
