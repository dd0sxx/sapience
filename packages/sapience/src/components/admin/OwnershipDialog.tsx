import { Button } from '@sapience/sdk/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@sapience/sdk/ui/components/ui/dialog';
import { Input } from '@sapience/sdk/ui/components/ui/input';
import { useState } from 'react';
import type { Address } from 'viem';
import { useAccount } from 'wagmi';

import { useMarketGroupOwnership } from '~/hooks/contract/useMarketGroupOwnership';

interface OwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketGroupAddress: Address;
  currentOwner?: string;
  chainId: number;
}

const OwnershipDialog = ({
  open,
  onOpenChange,
  marketGroupAddress,
  currentOwner,
  chainId,
}: OwnershipDialogProps) => {
  const { address: connectedAddress } = useAccount();
  const [nomineeAddress, setNomineeAddress] = useState('');
  const [nomineeError, setNomineeError] = useState('');
  const {
    nominateNewOwner,
    nominateLoading,
    nominateError,
    acceptOwnership,
    acceptLoading,
    acceptError,
    pendingOwner,
    pendingOwnerLoading,
    pendingOwnerError,
  } = useMarketGroupOwnership(marketGroupAddress);

  const isOwner =
    connectedAddress &&
    currentOwner &&
    connectedAddress.toLowerCase() === currentOwner.toLowerCase();
  const isNominated =
    connectedAddress &&
    pendingOwner &&
    connectedAddress.toLowerCase() === pendingOwner.toLowerCase();

  const handleNominate = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(nomineeAddress)) {
      setNomineeError('Invalid address');
      return;
    }
    setNomineeError('');
    try {
      await nominateNewOwner(nomineeAddress as Address, chainId);
      setNomineeAddress('');
      onOpenChange(false);
    } catch (_err) {
      setNomineeError(nominateError || 'Failed to nominate owner');
    }
  };

  const handleAccept = async () => {
    try {
      await acceptOwnership(chainId);
      onOpenChange(false);
    } catch (_err) {
      // Optionally handle error
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Market Group Ownership</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div>
              Current Owner:{' '}
              <span className="font-mono text-xs">{currentOwner || 'N/A'}</span>
            </div>
            <div>
              Nominated Owner:{' '}
              {pendingOwnerLoading && (
                <span className="text-xs">Loading...</span>
              )}
              {pendingOwnerError && (
                <span className="text-destructive text-xs">
                  Error loading nominated owner
                </span>
              )}
              {!pendingOwnerLoading && !pendingOwnerError && (
                <span className="font-mono text-xs">
                  {pendingOwner || 'N/A'}
                </span>
              )}
            </div>
          </div>
          {isOwner && (
            <div className="space-y-2">
              <Input
                placeholder="New owner address"
                value={nomineeAddress}
                onChange={(e) => setNomineeAddress(e.target.value)}
                disabled={nominateLoading}
              />
              {(nomineeError || nominateError) && (
                <div className="text-destructive text-xs">
                  {nomineeError || nominateError}
                </div>
              )}
              <Button
                onClick={handleNominate}
                size="sm"
                disabled={nominateLoading}
              >
                {nominateLoading ? 'Nominating...' : 'Nominate New Owner'}
              </Button>
            </div>
          )}
          {isNominated && (
            <div className="space-y-2">
              <Button onClick={handleAccept} size="sm" disabled={acceptLoading}>
                {acceptLoading ? 'Accepting...' : 'Accept Ownership'}
              </Button>
              {acceptError && (
                <div className="text-destructive text-xs">{acceptError}</div>
              )}
            </div>
          )}
          {!isOwner && !isNominated && (
            <div className="text-xs text-muted-foreground">
              Only the current owner can nominate a new owner. Only the
              nominated owner can accept ownership.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OwnershipDialog;
