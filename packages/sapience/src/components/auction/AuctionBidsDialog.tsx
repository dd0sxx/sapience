'use client';

import type React from 'react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@sapience/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@sapience/ui/components/ui/dialog';
import { TransactionAmountCell } from '~/components/markets/DataDrawer/TransactionCells';
import { AddressDisplay } from '~/components/shared/AddressDisplay';
import { useAuctionBids } from '~/lib/auction/useAuctionBids';

type Props = {
  auctionId: string | null;
  makerWager: string | null;
  collateralAssetTicker: string;
};

const AuctionBidsDialog: React.FC<Props> = ({
  auctionId,
  makerWager,
  collateralAssetTicker,
}) => {
  const [open, setOpen] = useState(false);
  const { bids } = useAuctionBids(open ? auctionId : null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs">{bids.length} Bids</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="pb-2">
          <DialogTitle>Bids</DialogTitle>
        </DialogHeader>
        {bids.length === 0 ? (
          <div className="text-sm text-muted-foreground px-1 py-2">
            No bids yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left align-middle font-medium">
                    Expires in
                  </th>
                  <th className="px-3 py-2 text-left align-middle font-medium">
                    Address
                  </th>
                  <th className="px-3 py-2 text-left align-middle font-medium">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left align-middle font-medium">
                    To Win
                  </th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b, i) => {
                  const deadlineSec = Number(b?.takerDeadline || 0);
                  const expiresLabel = (() => {
                    if (!Number.isFinite(deadlineSec) || deadlineSec <= 0)
                      return '—';
                    const ms = deadlineSec * 1000;
                    return ms > Date.now()
                      ? formatDistanceToNow(new Date(ms))
                      : 'Expired';
                  })();
                  const toWinStr = (() => {
                    try {
                      const maker = BigInt(String(makerWager ?? '0'));
                      const taker = BigInt(String(b?.takerWager ?? '0'));
                      return (maker + taker).toString();
                    } catch {
                      return String(b?.takerWager || '0');
                    }
                  })();
                  const uiTxAmount = {
                    id: i,
                    type: 'FORECAST',
                    createdAt: new Date().toISOString(),
                    collateral: String(b?.takerWager || '0'),
                    position: { owner: b?.taker || '' },
                  } as any;
                  const uiTxToWin = {
                    ...uiTxAmount,
                    collateral: toWinStr,
                  };
                  return (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {expiresLabel}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <AddressDisplay address={b?.taker || ''} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <TransactionAmountCell
                          tx={uiTxAmount}
                          collateralAssetTicker={collateralAssetTicker}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <TransactionAmountCell
                          tx={uiTxToWin}
                          collateralAssetTicker={collateralAssetTicker}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuctionBidsDialog;
