'use client';

import { useMemo } from 'react';
import QuestionItem from '../shared/QuestionItem';

interface QuestionSuggestionsProps {
  markets: any[];
  onMarketSelect: (market: any) => void;
}

const QuestionSuggestions = ({
  markets,
  onMarketSelect,
}: QuestionSuggestionsProps) => {
  // Get random 3 from the next 12 markets that are ending soonest
  const suggestedMarkets = useMemo(() => {
    // Sort markets by end timestamp (ascending - soonest ending first)
    const sortedByEndTime = [...markets].sort((a, b) => {
      const aEnd = a.endTimestamp || 0;
      const bEnd = b.endTimestamp || 0;
      return aEnd - bEnd;
    });

    // Take the next 12 markets that are ending
    const next12Ending = sortedByEndTime.slice(0, 12);

    // Randomly select 3 from those 12
    const shuffled = [...next12Ending].sort(() => Math.random() - 0.5);
    const suggested = shuffled.slice(0, 3);

    return suggested;
  }, [markets]);

  if (suggestedMarkets.length === 0) {
    return;
  }

  return (
    <div className="p-6 gap-1.5 flex flex-col">
      <h3 className="font-medium text-sm text-muted-foreground">
        Make a prediction
      </h3>
      <div className="bg-background border border-border rounded-lg shadow-sm overflow-hidden">
        <div>
          {suggestedMarkets.map((market, index) => (
            <QuestionItem
              key={market.id}
              item={market}
              onClick={onMarketSelect}
              showBorder={index < suggestedMarkets.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionSuggestions;
