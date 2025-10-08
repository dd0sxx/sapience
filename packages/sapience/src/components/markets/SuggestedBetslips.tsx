'use client';

import * as React from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sapience/sdk/ui/components/ui/tooltip';
import { Badge } from '@sapience/sdk/ui/components/ui/badge';
import { Button } from '@sapience/sdk/ui/components/ui/button';
import {
  useConditions,
  type ConditionType,
} from '~/hooks/graphql/useConditions';
import { useBetSlipContext } from '~/lib/context/BetSlipContext';
import { getCategoryStyle } from '~/lib/utils/categoryStyle';

type SuggestedBetslipsProps = {
  onRefresh?: () => void;
  className?: string;
};

const SuggestedBetslips: React.FC<SuggestedBetslipsProps> = ({
  onRefresh,
  className,
}) => {
  const [nonce, setNonce] = React.useState(0);
  const { data: allConditions = [], isLoading } = useConditions({ take: 200 });
  const { addParlaySelection } = useBetSlipContext();

  const handleRefresh = React.useCallback(() => {
    setNonce((n) => n + 1);
    onRefresh?.();
  }, [onRefresh]);

  const getCategoryColor = React.useCallback((slug?: string | null) => {
    return getCategoryStyle(slug).color;
  }, []);

  const combos = React.useMemo(() => {
    const publicConditions = (allConditions || []).filter((c) => c.public);
    if (publicConditions.length === 0)
      return [] as Array<
        Array<{ condition: ConditionType; prediction: boolean }>
      >;

    const byCategory = publicConditions.reduce<Record<string, ConditionType[]>>(
      (acc, c) => {
        const slug = c.category?.slug || 'uncategorized';
        if (!acc[slug]) acc[slug] = [];
        acc[slug].push(c);
        return acc;
      },
      {}
    );

    const categorySlugs = Object.keys(byCategory);
    const pickRandom = <T,>(arr: T[]): T =>
      arr[Math.floor(Math.random() * arr.length)];

    const makeOneCombo = (): Array<{
      condition: ConditionType;
      prediction: boolean;
    }> => {
      const result: Array<{ condition: ConditionType; prediction: boolean }> =
        [];

      // Prefer three distinct categories if available
      const shuffledCats = [...categorySlugs].sort(() => Math.random() - 0.5);
      for (const cat of shuffledCats) {
        if (result.length >= 3) break;
        const pool = byCategory[cat];
        if (!pool || pool.length === 0) continue;
        result.push({
          condition: pickRandom(pool),
          prediction: Math.random() < 0.5,
        });
      }

      // Fallback: fill remaining legs from any remaining conditions (avoid duplicates)
      if (result.length < 3) {
        const usedIds = new Set(result.map((r) => r.condition.id));
        const remaining = publicConditions.filter((c) => !usedIds.has(c.id));
        while (result.length < 3 && remaining.length > 0) {
          const idx = Math.floor(Math.random() * remaining.length);
          const [picked] = remaining.splice(idx, 1);
          result.push({ condition: picked, prediction: Math.random() < 0.5 });
        }
      }

      return result.slice(0, 3);
    };

    return [makeOneCombo(), makeOneCombo()];
  }, [allConditions, nonce]);

  return (
    <div className={'w-full ' + (className ?? '')}>
      <div className="p-0">
        <div className="flex items-center justify-between">
          <h3 className="font-normal text-sm text-muted-foreground">
            Example Predictions
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleRefresh}
                  aria-label="Randomize example predictions"
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                  title="Randomize example predictions"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Randomize example predictions</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="mt-1 mb-0 pb-0 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {isLoading || combos.length === 0 ? (
          <>
            <div className="border border-border rounded bg-card overflow-hidden h-20 flex items-center justify-center text-muted-foreground/80">
              Loading…
            </div>
            <div className="border border-border rounded bg-card overflow-hidden h-20 hidden sm:flex items-center justify-center text-muted-foreground/80">
              Loading…
            </div>
          </>
        ) : (
          combos.map((combo, idx) => (
            <div
              key={`combo-${idx}`}
              className="border border-border rounded bg-card overflow-hidden p-0"
            >
              <div className="space-y-0 flex flex-col">
                {combo.map((leg, i) => (
                  <div
                    key={leg.condition.id + '-' + i}
                    className="border-b border-border last:border-b-0 flex-1"
                  >
                    <div className="flex items-stretch min-h-[72.5px]">
                      <div
                        className="w-1 self-stretch"
                        style={{
                          backgroundColor: getCategoryColor(
                            leg.condition.category?.slug
                          ),
                        }}
                      />
                      <div className="flex-1 px-4 py-0 flex items-center">
                        <h3 className="text-base text-foreground whitespace-normal break-words">
                          {leg.condition.question}{' '}
                          <span className="relative -top-0.5">
                            <Badge
                              variant="outline"
                              className={`${leg.prediction ? 'px-1.5 py-0.5 text-xs font-medium border-green-500/40 bg-green-500/10 text-green-600 shrink-0' : 'px-1.5 py-0.5 text-xs font-medium border-red-500/40 bg-red-500/10 text-red-600 shrink-0'}`}
                            >
                              {leg.prediction ? 'Yes' : 'No'}
                            </Badge>
                          </span>
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="px-3 pb-3 pt-3">
                  <Button
                    className="w-full"
                    variant="default"
                    type="button"
                    onClick={() => {
                      combo.forEach((leg) => {
                        addParlaySelection({
                          conditionId: leg.condition.id,
                          question: leg.condition.question,
                          prediction: leg.prediction,
                        });
                      });
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Predictions
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SuggestedBetslips;
