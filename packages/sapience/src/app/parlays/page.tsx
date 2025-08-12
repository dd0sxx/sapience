'use client';

import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { erc20Abi } from 'viem';
import { Badge } from '@sapience/ui/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead,
} from '@sapience/ui/components/ui/table';
import { Button } from '@sapience/ui/components/ui/button';
import type { Abi } from 'abitype';
import ParlayPool from '@/protocol/deployments/ParlayPool.json';
import { AddressDisplay } from '~/components/shared/AddressDisplay';
import { useParlays, PARLAY_CONTRACT_ADDRESS } from '~/hooks/useParlays';
import { useFillParlayOrder } from '~/hooks/forms/useFillParlayOrder';

function formatTimeUntil(timestampSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const delta = timestampSec - now;
  if (delta <= 0) return 'expired';
  const minutes = Math.floor(delta / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  return `in ${minutes} min`;
}

function OutcomesCell({
  outcomes,
}: {
  outcomes: {
    prediction: boolean;
    market: { marketGroup: Address; marketId: bigint };
  }[];
}) {
  if (!outcomes?.length)
    return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {outcomes.map((o, idx) => (
        <Badge
          key={`${o.market.marketGroup}-${o.market.marketId.toString()}-${idx}`}
          variant={o.prediction ? 'default' : 'secondary'}
          className="px-2 py-0.5 text-xs"
        >
          {o.prediction ? 'Yes' : 'No'} #{o.market.marketId.toString()}
        </Badge>
      ))}
    </div>
  );
}

const ParlaysPage = () => {
  const { address, chainId } = useAccount();
  const { loading, parlays, collateralToken, tokenDecimals, unfilledIds } =
    useParlays();

  // ERC20 symbol (optional polish)
  const symbolRead = useReadContracts({
    contracts: collateralToken
      ? [
          {
            address: collateralToken,
            abi: erc20Abi,
            functionName: 'symbol',
            chainId,
          },
        ]
      : [],
    query: { enabled: !!collateralToken },
  });

  const collateralSymbol: string | undefined = useMemo(() => {
    const item = symbolRead.data?.[0];
    if (item && item.status === 'success') return String(item.result);
    return undefined;
  }, [symbolRead.data]);

  const openOrders = useMemo(
    () => (parlays || []).filter((p: any) => !p.filled),
    [parlays]
  );

  // Read order IDs for the connected account (maker or taker)
  const myIdsRead = useReadContracts({
    contracts: address
      ? [
          {
            address: PARLAY_CONTRACT_ADDRESS,
            abi: (ParlayPool as { abi: Abi }).abi,
            functionName: 'getOrderIdsByAddress',
            args: [address],
            chainId,
          },
        ]
      : [],
    query: { enabled: !!address },
  });

  const myIds: bigint[] = useMemo(() => {
    const item = myIdsRead.data?.[0];
    if (item && item.status === 'success') {
      const arr = item.result as bigint[];
      return Array.isArray(arr) ? arr : [];
    }
    return [];
  }, [myIdsRead.data]);

  return (
    <div className="container mx-auto max-w-6xl px-4">
      <div className="pt-12 md:pt-16">
        <h1 className="text-2xl md:text-3xl font-heading mb-6 flex items-center gap-4">
          Parlays
          <Badge
            variant="outline"
            className="px-1.5 py-0.5 text-xs font-medium border-yellow-500/40 bg-yellow-500/10 text-yellow-600 inline-flex items-center gap-1 mr-4"
          >
            <AlertTriangle className="w-3 h-3" />
            Experimental Feature
          </Badge>
        </h1>
        <h2 className="text-lg font-medium mb-3">Open Orders</h2>
        <div className="w-full overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Maker</TableHead>
                <TableHead>Predicted Outcomes</TableHead>
                <TableHead>Fill Amount</TableHead>
                <TableHead>Total Payout</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    Loading parlays...
                  </TableCell>
                </TableRow>
              ) : (unfilledIds?.length ?? 0) === 0 &&
                openOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No open orders
                  </TableCell>
                </TableRow>
              ) : (unfilledIds?.length ?? 0) > 0 ? (
                unfilledIds.map((id) => {
                  const order = openOrders.find((o: any) => o.id === id);
                  return order ? (
                    <OpenOrderRow
                      key={id.toString()}
                      order={order}
                      address={address}
                      chainId={chainId}
                      collateralSymbol={collateralSymbol}
                      tokenDecimals={tokenDecimals}
                    />
                  ) : (
                    <TableRow key={id.toString()}>
                      <TableCell className="font-mono align-middle">
                        {id.toString()}
                      </TableCell>
                      <TableCell className="align-middle">—</TableCell>
                      <TableCell className="align-middle">—</TableCell>
                      <TableCell className="align-middle">—</TableCell>
                      <TableCell className="align-middle">—</TableCell>
                      <TableCell className="align-middle">—</TableCell>
                      <TableCell className="text-right align-middle">
                        —
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                openOrders.map((order: any) => (
                  <OpenOrderRow
                    key={order.id.toString()}
                    order={order}
                    address={address}
                    chainId={chainId}
                    collateralSymbol={collateralSymbol}
                    tokenDecimals={tokenDecimals}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {address && (
          <div className="mt-10">
            <h2 className="text-lg font-medium mb-2">Your Parlays</h2>
            <div className="w-full overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Predicted Outcomes</TableHead>
                    <TableHead>Collateral</TableHead>
                    <TableHead>Total Payout</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        Loading your parlays...
                      </TableCell>
                    </TableRow>
                  ) : myIds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        You have no parlays yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    myIds.map((id) => {
                      const p = (parlays || []).find(
                        (item: any) => item.id === id
                      );
                      return (
                        <TableRow key={id.toString()}>
                          <TableCell className="font-mono align-middle">
                            {id.toString()}
                          </TableCell>
                          <TableCell className="align-middle">
                            {p &&
                            address &&
                            p.maker?.toLowerCase() === address.toLowerCase()
                              ? 'Maker'
                              : p && address
                                ? 'Taker'
                                : '—'}
                          </TableCell>
                          <TableCell className="align-middle">
                            {p ? (
                              <OutcomesCell outcomes={p.predictedOutcomes} />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="align-middle">
                            {p ? (
                              <span className="text-muted-foreground">
                                {p.collateralFormatted}{' '}
                                {collateralSymbol || 'TOKEN'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="align-middle">
                            {p ? (
                              <span className="text-muted-foreground">
                                {p.payoutFormatted}{' '}
                                {collateralSymbol || 'TOKEN'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="align-middle">
                            {p ? (
                              p.settled ? (
                                <Badge
                                  variant={p.makerWon ? 'default' : 'secondary'}
                                  className="px-2 py-0.5 text-xs"
                                >
                                  {p.makerWon ? 'Maker Won' : 'Taker Won'}
                                </Badge>
                              ) : p.filled ? (
                                <span className="text-muted-foreground">
                                  Active
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Open
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function OpenOrderRow({
  order,
  address,
  chainId,
  collateralSymbol,
  tokenDecimals,
}: {
  order: any;
  address?: Address;
  chainId?: number;
  collateralSymbol?: string;
  tokenDecimals?: number;
}) {
  const isMaker =
    !!address &&
    order.maker?.toLowerCase() === (address as string).toLowerCase();
  const canFill = !order.filled && !isMaker;

  const { fillParlay, isFilling } = useFillParlayOrder({
    requestId: BigInt(order.id),
    payout: BigInt(order.payout),
    collateral: BigInt(order.collateral),
    chainId,
    enabled: canFill,
  });

  const delta = useMemo(() => {
    try {
      const d = BigInt(order.payout) - BigInt(order.collateral);
      return d < 0n ? 0n : d;
    } catch {
      return 0n;
    }
  }, [order.payout, order.collateral]);

  const fillAmountFormatted = useMemo(() => {
    // order already has formatted fields; fall back to raw if missing
    if (
      typeof order.payoutFormatted === 'string' &&
      typeof order.collateralFormatted === 'string'
    ) {
      const num =
        Number(order.payoutFormatted) - Number(order.collateralFormatted);
      return Number.isFinite(num) ? num.toFixed(2) : undefined;
    }
    // fallback: display raw in token decimals if provided
    if (tokenDecimals != null) {
      try {
        const factor = 10 ** tokenDecimals;
        const val = Number(delta) / factor;
        return val.toFixed(2);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [order.payoutFormatted, order.collateralFormatted, tokenDecimals, delta]);

  return (
    <TableRow>
      <TableCell className="font-mono align-middle">
        {order.id.toString()}
      </TableCell>
      <TableCell className="align-middle">
        <AddressDisplay address={order.maker as Address} />
      </TableCell>
      <TableCell className="align-middle">
        <OutcomesCell outcomes={order.predictedOutcomes} />
      </TableCell>
      <TableCell className="align-middle">
        <span className="text-muted-foreground">
          {fillAmountFormatted ?? '—'} {collateralSymbol || 'TOKEN'}
        </span>
      </TableCell>
      <TableCell className="align-middle">
        <span className="text-muted-foreground">
          {order.payoutFormatted} {collateralSymbol || 'TOKEN'}
        </span>
      </TableCell>
      <TableCell className="align-middle">
        <span className="text-muted-foreground">
          {formatTimeUntil(Number(order.orderExpirationTime))}
        </span>
      </TableCell>
      <TableCell className="text-right align-middle">
        {canFill ? (
          <Button size="sm" onClick={() => fillParlay()} disabled={isFilling}>
            {isFilling ? 'Filling…' : 'Fill'}
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">
            {isMaker ? 'Your order' : '—'}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

export default ParlaysPage;
