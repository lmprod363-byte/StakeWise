import React, { memo } from 'react';
import { cn } from '../lib/utils';

interface RenderEventWithScoreProps {
  event: string;
  score?: string;
  matchTime?: string;
  mobile?: boolean;
}

export const RenderEventWithScore = memo(({ event, score, matchTime, mobile = false }: RenderEventWithScoreProps) => {
  if (!score) return <>{event}</>;

  const separators = [' — ', ' x ', ' X ', ' vs ', ' VS ', ' v ', ' V '];
  let foundSeparator = '';
  
  for (const sep of separators) {
    if (event.includes(sep)) {
      foundSeparator = sep;
      break;
    }
  }

  const scoreClasses = cn(
    "inline-flex items-center whitespace-nowrap",
    mobile 
      ? "bg-accent/20 text-accent px-1.5 py-0.5 rounded-full text-[9px] font-black border border-accent/30 mx-1 shadow-[0_0_10px_rgba(0,255,149,0.1)]"
      : "bg-accent/10 text-accent px-1.5 py-0.5 rounded-md text-[9px] font-black border border-accent/20 mx-2 shadow-[0_0_10px_rgba(0,255,149,0.1)]"
  );

  const renderScoreContent = () => (
    <span className={scoreClasses}>
      {score}
      {matchTime && <span className="ml-1 text-[8px] opacity-70 font-medium">({matchTime})</span>}
    </span>
  );

  if (foundSeparator) {
    const parts = event.split(foundSeparator);
    return (
      <span>
        {parts[0]}
        {renderScoreContent()}
        {parts[1]}
      </span>
    );
  }

  return (
    <>
      {event}
      <span className="ml-2">{renderScoreContent()}</span>
    </>
  );
});
