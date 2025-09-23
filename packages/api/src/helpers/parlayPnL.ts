import prisma from '../db';

export interface ParlayPnLEntry {
  owner: string;
  totalPnL: string; // in wei
  parlayCount: number;
}

/**
 * Super simple parlay PnL calculation using PredictionBurned events
 * We need to track what each person put in vs what they got out
 * - Winner gets totalCollateral (their profit = totalCollateral - their_stake)
 * - Loser gets 0 (their loss = 0 - their_stake = -their_stake)
 */
export async function calculateParlayPnL(
  chainId?: number,
  marketAddress?: string,
  owners?: string[]
): Promise<ParlayPnLEntry[]> {
  // We need both PredictionMinted (to get stakes) and PredictionBurned (to get outcomes)
  // Let's get settled parlays from the parlay table and their corresponding events
  const whereClause: any = {
    status: { in: ['settled', 'consolidated'] },
    makerWon: { not: null },
  };
  
  if (chainId) whereClause.chainId = chainId;
  if (marketAddress) whereClause.marketAddress = marketAddress.toLowerCase();

  const parlays = await prisma.parlay.findMany({ where: whereClause });

  // Get mint events to find original stakes
  const mintTimestamps = Array.from(new Set(parlays.map(p => BigInt(p.mintedAt))));
  const mintEvents = await prisma.event.findMany({
    where: {
      marketGroupId: null,
      timestamp: { in: mintTimestamps },
    },
  });

  // Build lookup map for mint data
  const mintEventMap = new Map();
  for (const event of mintEvents) {
    try {
      const data = event.logData as any;
      if (data.eventType === 'PredictionMinted') {
        const key = `${data.makerNftTokenId}-${data.takerNftTokenId}`;
        mintEventMap.set(key, data);
      }
    } catch (e) {
      continue;
    }
  }

  const ownerStats = new Map<string, { totalPnL: bigint; parlayCount: number }>();

  for (const parlay of parlays) {
    const mintKey = `${parlay.makerNftTokenId}-${parlay.takerNftTokenId}`;
    const mintData = mintEventMap.get(mintKey);
    if (!mintData) continue;

    const maker = parlay.maker.toLowerCase();
    const taker = parlay.taker.toLowerCase();
    const makerCollateral = BigInt(mintData.makerCollateral || '0');
    const takerCollateral = BigInt(mintData.takerCollateral || '0');
    const totalCollateral = BigInt(mintData.totalCollateral || '0');

    // Filter by owners if specified
    if (owners?.length) {
      const ownerSet = new Set(owners.map(o => o.toLowerCase()));
      if (!ownerSet.has(maker) && !ownerSet.has(taker)) continue;
    }

    // Initialize stats
    if (!ownerStats.has(maker)) {
      ownerStats.set(maker, { totalPnL: 0n, parlayCount: 0 });
    }
    if (!ownerStats.has(taker)) {
      ownerStats.set(taker, { totalPnL: 0n, parlayCount: 0 });
    }

    const makerStats = ownerStats.get(maker)!;
    const takerStats = ownerStats.get(taker)!;

    if (parlay.makerWon) {
      // Maker wins: profit = totalCollateral - makerCollateral
      makerStats.totalPnL += (totalCollateral - makerCollateral);
      makerStats.parlayCount++;
      // Taker loses: loss = -takerCollateral
      takerStats.totalPnL -= takerCollateral;
      takerStats.parlayCount++;
    } else {
      // Taker wins: profit = totalCollateral - takerCollateral  
      takerStats.totalPnL += (totalCollateral - takerCollateral);
      takerStats.parlayCount++;
      // Maker loses: loss = -makerCollateral
      makerStats.totalPnL -= makerCollateral;
      makerStats.parlayCount++;
    }
  }

  // Convert to result format
  return Array.from(ownerStats.entries()).map(([owner, stats]) => ({
    owner,
    totalPnL: stats.totalPnL.toString(),
    parlayCount: stats.parlayCount,
  }));
}
