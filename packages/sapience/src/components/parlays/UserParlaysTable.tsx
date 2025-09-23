'use client';

import type { Address } from 'viem';
import { formatEther } from 'viem';
const ZERO_REF_CODE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sapience/ui/components/ui/table';
import { Button } from '@sapience/ui/components/ui/button';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, HelpCircle } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@sapience/ui/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sapience/ui/components/ui/tooltip';
import EmptyTabState from '~/components/shared/EmptyTabState';
import { usePredictionMarketWriteContract } from '~/hooks/blockchain/usePredictionMarketWriteContract';
import { useUserParlays } from '~/hooks/graphql/useUserParlays';
import NumberDisplay from '~/components/shared/NumberDisplay';
import ShareDialog from '~/components/shared/ShareDialog';

function EndsInButton({ endsAtMs }: { endsAtMs: number }) {
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const days = Math.max(
    1,
    Math.ceil((endsAtMs - nowMs) / (1000 * 60 * 60 * 24))
  );
  return (
    <Button size="sm" variant="outline" disabled>
      {`Ends In ${days} Days`}
    </Button>
  );
}

export default function UserParlaysTable({
  account,
  showHeaderText = true,
}: {
  account: Address;
  showHeaderText?: boolean;
}) {
  // ---
  const { burn, isPending: isClaimPending } = usePredictionMarketWriteContract({
    successMessage: 'Claim submitted',
    fallbackErrorMessage: 'Claim failed',
  });
  type UILeg = { question: string; choice: 'Yes' | 'No' };
  type UIParlay = {
    positionId: number;
    legs: UILeg[];
    direction: 'Long' | 'Short';
    endsAt: number; // ms
    status: 'active' | 'won' | 'lost';
    tokenIdToClaim?: bigint;
    createdAt: number; // ms
    totalPayoutWei: bigint; // total payout if won
    makerCollateralWei?: bigint; // user's wager if they are maker
    takerCollateralWei?: bigint; // user's wager if they are taker
    addressRole: 'maker' | 'taker' | 'unknown';
  };

  // Fetch real data
  const { data } = useUserParlays({ address: String(account) });
  // ---

  const viewer = React.useMemo(
    () => String(account || '').toLowerCase(),
    [account]
  );
  const rows: UIParlay[] = React.useMemo(() => {
    return (data || []).map((p: any) => {
      const legs: UILeg[] = (p.predictedOutcomes || []).map((o: any) => ({
        question:
          o?.condition?.shortName || o?.condition?.question || o.conditionId,
        choice: o.prediction ? 'Yes' : 'No',
      }));
      const endsAtSec =
        p.endsAt ||
        Math.max(
          0,
          ...(p.predictedOutcomes || []).map(
            (o: any) => o?.condition?.endTime || 0
          )
        );
      const userIsMaker =
        typeof p.maker === 'string' && p.maker.toLowerCase() === viewer;
      const userIsTaker =
        typeof p.taker === 'string' && p.taker.toLowerCase() === viewer;
      const isActive = p.status === 'active';
      const userWon =
        !isActive &&
        ((userIsMaker && p.makerWon === true) ||
          (userIsTaker && p.makerWon === false));
      const status: UIParlay['status'] = isActive
        ? 'active'
        : userWon
          ? 'won'
          : 'lost';
      const tokenIdToClaim = userWon
        ? userIsMaker
          ? BigInt(p.makerNftTokenId)
          : BigInt(p.takerNftTokenId)
        : undefined;
      // Choose positionId based on the profile address' role
      const positionId = userIsMaker
        ? Number(p.makerNftTokenId)
        : userIsTaker
          ? Number(p.takerNftTokenId)
          : p.makerNftTokenId
            ? Number(p.makerNftTokenId)
            : p.id;
      // Choose wager based on the profile address' role
      const viewerMakerCollateralWei = (() => {
        try {
          return p.makerCollateral ? BigInt(p.makerCollateral) : undefined;
        } catch {
          return undefined;
        }
      })();
      const viewerTakerCollateralWei = (() => {
        try {
          return p.takerCollateral ? BigInt(p.takerCollateral) : undefined;
        } catch {
          return undefined;
        }
      })();
      return {
        positionId,
        legs,
        direction: 'Long',
        endsAt: endsAtSec ? endsAtSec * 1000 : Date.now(),
        status,
        tokenIdToClaim,
        createdAt: p.mintedAt ? Number(p.mintedAt) * 1000 : Date.now(),
        totalPayoutWei: (() => {
          try {
            return BigInt(p.totalCollateral || '0');
          } catch {
            return 0n;
          }
        })(),
        makerCollateralWei: viewerMakerCollateralWei,
        takerCollateralWei: viewerTakerCollateralWei,
        addressRole: userIsMaker ? 'maker' : userIsTaker ? 'taker' : 'unknown',
      };
    });
  }, [data, viewer]);

  // Keep Share dialog open state outside of row to survive re-renders
  const [openShareParlayId, setOpenShareParlayId] = React.useState<
    number | null
  >(null);
  const selectedParlay = React.useMemo(() => {
    if (openShareParlayId === null) return null;
    return rows.find((r) => r.positionId === openShareParlayId) || null;
  }, [rows, openShareParlayId]);
  // ---

  const columns = React.useMemo<ColumnDef<UIParlay>[]>(
    () => [
      {
        id: 'positionId',
        accessorFn: (row) => row.positionId,
        sortingFn: (rowA, rowB) =>
          rowA.original.createdAt - rowB.original.createdAt,
        size: 360,
        minSize: 260,
        maxSize: 420,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="px-0 h-auto font-medium text-foreground hover:opacity-80 transition-opacity inline-flex items-center"
            aria-sort={
              column.getIsSorted() === false
                ? 'none'
                : column.getIsSorted() === 'asc'
                  ? 'ascending'
                  : 'descending'
            }
          >
            Position
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const created = new Date(row.original.createdAt).toLocaleDateString(
            'en-US',
            {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
            }
          );
          return (
            <div>
              <h2 className="text-[17px] font-medium text-foreground leading-[1.35] tracking-[-0.01em] mb-0.5">
                Position #{row.original.positionId}
              </h2>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>created at {created}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'wager',
        accessorFn: (row) => {
          // Show the viewer's contributed collateral as the wager
          const viewerWagerWei =
            row.addressRole === 'maker'
              ? (row.makerCollateralWei ?? 0n)
              : row.addressRole === 'taker'
                ? (row.takerCollateralWei ?? 0n)
                : (row.makerCollateralWei ?? row.takerCollateralWei ?? 0n);
          return Number(formatEther(viewerWagerWei));
        },
        size: 260,
        minSize: 220,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="px-0 h-auto font-medium text-foreground hover:opacity-80 transition-opacity inline-flex items-center"
            aria-sort={
              column.getIsSorted() === false
                ? 'none'
                : column.getIsSorted() === 'asc'
                  ? 'ascending'
                  : 'descending'
            }
          >
            Wager
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const symbol = 'USDe';
          const isClosed = row.original.status !== 'active';
          const totalPayout = Number(
            formatEther(row.original.totalPayoutWei || 0n)
          );
          const viewerWagerWei =
            row.original.addressRole === 'maker'
              ? (row.original.makerCollateralWei ?? 0n)
              : row.original.addressRole === 'taker'
                ? (row.original.takerCollateralWei ?? 0n)
                : (row.original.makerCollateralWei ??
                  row.original.takerCollateralWei ??
                  0n);
          const viewerWager = Number(formatEther(viewerWagerWei));
          return (
            <div>
              <div className="whitespace-nowrap">
                <NumberDisplay value={viewerWager} /> {symbol}
              </div>
              {!isClosed && (
                <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1 whitespace-nowrap">
                  To Win: <NumberDisplay value={totalPayout} /> {symbol}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'conditions',
        accessorFn: (row) => row.legs.length,
        enableSorting: false,
        size: 400,
        minSize: 300,
        header: () => null,
        cell: ({ row }) => (
          <div className="space-y-1">
            {row.original.addressRole === 'taker' && (
              <div className="mb-1">
                <div className="flex items-center gap-1">
                  <Badge variant="outline">Anti-Parlay</Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Anti-Parlay details"
                          className="inline-flex items-center justify-center h-5 w-5 text-muted-foreground hover:text-foreground"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          This position is that one or more of these conditions
                          will not be met.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
            {row.original.legs.map((leg, idx) => (
              <div key={idx} className="text-sm flex items-center gap-2">
                <span className="font-medium">{leg.question}</span>
                <Badge
                  variant="outline"
                  className={
                    leg.choice === 'Yes'
                      ? 'px-1.5 py-0.5 text-xs font-medium border-green-500/40 bg-green-500/10 text-green-600 shrink-0'
                      : 'px-1.5 py-0.5 text-xs font-medium border-red-500/40 bg-red-500/10 text-red-600 shrink-0'
                  }
                >
                  {leg.choice}
                </Badge>
              </div>
            ))}
          </div>
        ),
      },

      {
        id: 'actions',
        enableSorting: false,
        size: 140,
        minSize: 100,
        header: () => null,
        cell: ({ row }) => (
          <div className="whitespace-nowrap xl:mt-0">
            <div className="flex items-center gap-2 justify-start xl:justify-end">
              {row.original.status === 'active' && (
                <EndsInButton endsAtMs={row.original.endsAt} />
              )}
              {row.original.status === 'won' &&
                row.original.tokenIdToClaim !== undefined && (
                  <Button
                    size="sm"
                    onClick={() =>
                      burn(row.original.tokenIdToClaim!, ZERO_REF_CODE)
                    }
                    disabled={isClaimPending}
                  >
                    {isClaimPending ? 'Claiming...' : 'Claim Winnings'}
                  </Button>
                )}
              {row.original.status === 'lost' && (
                <Button size="sm" variant="outline" disabled>
                  Parlay Lost
                </Button>
              )}
              <button
                type="button"
                className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-sm bg-background hover:bg-muted/50 border-border"
                onClick={() => setOpenShareParlayId(row.original.positionId)}
              >
                Share
              </button>
            </div>
          </div>
        ),
      },
    ],
    [isClaimPending, burn, account]
  );

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'positionId', desc: true },
  ]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: false,
    getRowId: (row) => String(row.positionId),
  });

  // Claim button is inlined per row using shared hook to avoid many hook instances

  return (
    <div>
      {showHeaderText && (
        <h2 className="text-lg font-medium mb-2">Your Parlays</h2>
      )}
      {rows.length === 0 ? (
        <EmptyTabState message="No parlays found" />
      ) : (
        <div className="rounded border">
          <Table className="table-auto">
            <TableHeader className="hidden xl:table-header-group bg-muted/30 text-sm font-medium text-muted-foreground border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={
                        header.id === 'actions' ? 'text-right' : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="xl:table-row block border-b space-y-3 xl:space-y-0 px-4 py-4 xl:py-0 align-top"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`block xl:table-cell px-0 py-0 xl:px-4 xl:py-3 ${cell.column.id === 'actions' ? 'text-left xl:text-right xl:mt-0' : ''}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {selectedParlay && (
        <ShareDialog
          question={`Parlay #${selectedParlay.positionId}`}
          legs={selectedParlay.legs?.map((l) => ({
            question: l.question,
            choice: l.choice,
          }))}
          wager={Number(
            formatEther(
              selectedParlay.makerCollateralWei ??
                selectedParlay.takerCollateralWei ??
                0n
            )
          )}
          payout={Number(formatEther(selectedParlay.totalPayoutWei || 0n))}
          symbol="USDe"
          owner={String(account)}
          imagePath="/og/parlay"
          open={openShareParlayId !== null}
          onOpenChange={(next) => {
            if (!next) setOpenShareParlayId(null);
          }}
          trigger={<span />}
          title="Share Your Parlay"
        />
      )}
    </div>
  );
}
