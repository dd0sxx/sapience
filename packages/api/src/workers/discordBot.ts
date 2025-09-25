import { EmbedBuilder, WebhookClient } from 'discord.js';
import { LogData } from '../interfaces';
import { EventType } from '../interfaces';
import { formatUnits } from 'viem';
import prisma from '../db';
import {
  truncateAddress,
  formatToFirstSignificantDecimal,
} from '../utils/utils';
import * as Chains from 'viem/chains';

const DISCORD_WEBHOOK_URLS = process.env.DISCORD_WEBHOOK_URLS; // Comma-separated list

const webhookClients: WebhookClient[] = [];
const sapienceProfileURL = 'https://www.sapience.xyz/profile/';

if (DISCORD_WEBHOOK_URLS) {
  const urls = DISCORD_WEBHOOK_URLS.split(',')
    .map((url) => url.trim())
    .filter((url) => url);

  for (const url of urls) {
    try {
      webhookClients.push(new WebhookClient({ url }));
    } catch (error) {
      console.error(`Failed to create webhook client for URL ${url}:`, error);
    }
  }
}

export const alertMarketEvent = async (
  chainId: number,
  address: string,
  logData: LogData
) => {
  try {
    if (webhookClients.length === 0) {
      console.warn('No Discord webhooks configured, skipping alert');
      return;
    }

    if (logData.eventName === EventType.Transfer) {
      return;
    }

    let title = '';
    const positionId = parseInt(logData.topics[3], 16);
    switch (logData.eventName) {
      case EventType.TraderPositionCreated:
      case EventType.TraderPositionModified: {
        let questionName = 'Unknown Market';
        let collateralSymbol = 'token';
        try {
          const marketObj = await prisma.marketGroup.findFirst({
            where: { address: address.toLowerCase(), chainId },
            include: { resource: true },
          });

          if (marketObj) {
            questionName = marketObj.question || 'Unknown Market';
            collateralSymbol = marketObj.collateralSymbol || 'token';
          }
        } catch (error) {
          console.error('Failed to fetch market info:', error);
        }

        const collateralAmount = logData.args.positionCollateralAmount || '0';
        const formattedCollateral = formatUnits(
          BigInt(String(collateralAmount)),
          18
        );
        const collateralDisplay = formatToFirstSignificantDecimal(
          Number(formattedCollateral)
        );

        const senderAddress = truncateAddress(
          String(logData.args.sender || '')
        );
        const fullSenderAddress = String(logData.args.sender || '');
        title = `[${senderAddress}](${sapienceProfileURL}${fullSenderAddress}) traded ${collateralDisplay} ${collateralSymbol} in "${questionName}" (Position ID: #${positionId})`;
        break;
      }

      case EventType.LiquidityPositionCreated:
      case EventType.LiquidityPositionIncreased:
      case EventType.LiquidityPositionDecreased:
      case EventType.LiquidityPositionClosed: {
        let questionName = 'Unknown Market';
        let collateralSymbol = 'token';
        try {
          const marketObj = await prisma.marketGroup.findFirst({
            where: { address: address.toLowerCase(), chainId },
            include: { resource: true },
          });

          if (marketObj) {
            questionName = marketObj.question || 'Unknown Market';
            collateralSymbol = marketObj.collateralSymbol || 'token';
          }
        } catch (error) {
          console.error('Failed to fetch market info:', error);
        }

        const formattedCollateral = formatUnits(
          BigInt(String(logData.args.deltaCollateral || '0')),
          18
        );
        const collateralDisplay = formatToFirstSignificantDecimal(
          Number(formattedCollateral)
        );

        const senderAddress = truncateAddress(
          String(logData.args.sender || '')
        );
        const fullSenderAddress = String(logData.args.sender || '');
        title = `[${senderAddress}](${sapienceProfileURL}${fullSenderAddress}) LPed ${collateralDisplay} ${collateralSymbol} in "${questionName}" (Position ID: #${positionId})`;
        break;
      }
      default:
        return;
    }

    // Get block explorer URL based on chain ID
    const getBlockExplorerUrl = (chainId: number, txHash: string) => {
      const chain = Object.values(Chains).find((c) => c.id === chainId);
      return chain?.blockExplorers?.default?.url
        ? `${chain.blockExplorers.default.url}/tx/${txHash}`
        : `https://etherscan.io/tx/${txHash}`;
    };

    const embed = new EmbedBuilder()
      .setColor('#2b2b2e')
      .addFields({
        name: 'Transaction',
        value: getBlockExplorerUrl(chainId, logData.transactionHash),
      })
      .setTimestamp();

    for (const webhookClient of webhookClients) {
      await webhookClient.send({
        content: title,
        embeds: [embed],
        username: 'Sapience Alerts',
        avatarURL: 'https://www.sapience.xyz/icons/icon-512x512.png',
      });
    }
  } catch (error) {
    console.error('Failed to send Discord webhook alert:', error);
  }
};

export const alertParlayEvent = async (
  chainId: number,
  eventType: 'PredictionMinted' | 'PredictionBurned' | 'PredictionConsolidated',
  eventData: {
    maker: string;
    taker: string;
    makerNftTokenId: string;
    takerNftTokenId: string;
    totalCollateral: string;
    makerCollateral?: string;
    takerCollateral?: string;
    makerWon?: boolean;
    transactionHash: string;
    blockNumber: number;
    timestamp: number;
    endsAt?: number | null;
    predictedOutcomes?: Array<{
      conditionId: string;
      prediction: boolean;
    }>;
  }
) => {
  try {
    console.log(`[Discord] alertParlayEvent called: ${eventType} on chain ${chainId} for NFTs ${eventData.makerNftTokenId}/${eventData.takerNftTokenId}`);
    if (webhookClients.length === 0) {
      console.warn('No Discord webhooks configured, skipping parlay alert');
      return;
    }

    let title = '';
    let color = '#2b2b2e';
    
    // Format collateral amount
    const formattedCollateral = formatUnits(BigInt(eventData.totalCollateral), 18);
    const collateralDisplay = formatToFirstSignificantDecimal(Number(formattedCollateral));
    
    // Format individual collateral amounts if available
    let makerCollateralDisplay = '';
    let takerCollateralDisplay = '';
    if (eventData.makerCollateral && eventData.takerCollateral) {
      const formattedMakerCollateral = formatUnits(BigInt(eventData.makerCollateral), 18);
      const formattedTakerCollateral = formatUnits(BigInt(eventData.takerCollateral), 18);
      makerCollateralDisplay = formatToFirstSignificantDecimal(Number(formattedMakerCollateral));
      takerCollateralDisplay = formatToFirstSignificantDecimal(Number(formattedTakerCollateral));
    }
    
    const makerAddress = truncateAddress(eventData.maker);
    const takerAddress = truncateAddress(eventData.taker);

    // Fetch market information for predicted outcomes
    let parlayLegsText = '';
    if (eventData.predictedOutcomes && eventData.predictedOutcomes.length > 0) {
      try {
        const conditionIds = eventData.predictedOutcomes.map(o => o.conditionId);
        const conditions = await prisma.condition.findMany({
          where: { id: { in: conditionIds } },
          include: {
            category: true
          }
        });

        const conditionMap = new Map(conditions.map(c => [c.id, c]));
        
        const legs = eventData.predictedOutcomes.map(outcome => {
          const condition = conditionMap.get(outcome.conditionId);
          if (!condition) {
            return `• ${outcome.prediction ? 'YES' : 'NO'} on Unknown Market`;
          }
          
          // Use condition question or shortName as the market name
          const marketName = condition.question || condition.shortName || 'Unknown Market';
          const prediction = outcome.prediction ? 'YES' : 'NO';
          
          return `• **${prediction}** on "${marketName}"`;
        });
        
        parlayLegsText = legs.join('\n');
      } catch (error) {
        console.error('Failed to fetch market information for parlay legs:', error);
        parlayLegsText = `• ${eventData.predictedOutcomes.length} predictions (details unavailable)`;
      }
    }
    
    switch (eventType) {
      case 'PredictionMinted':
        title = `🎯 New Parlay Created!`;
        color = '#00ff00'; // Green for new parlays
        break;
      case 'PredictionBurned':
        title = `🔥 Parlay Settled!`;
        color = eventData.makerWon ? '#ffd700' : '#ff6b6b'; // Gold if maker won, red if taker won
        break;
      case 'PredictionConsolidated':
        title = `🤝 Parlay Consolidated!`;
        color = '#00bfff'; // Blue for consolidation
        break;
      default:
        return;
    }

    // Get block explorer URL based on chain ID
    const getBlockExplorerUrl = (chainId: number, txHash: string) => {
      const chain = Object.values(Chains).find((c) => c.id === chainId);
      return chain?.blockExplorers?.default?.url
        ? `${chain.blockExplorers.default.url}/tx/${txHash}`
        : `https://etherscan.io/tx/${txHash}`;
    };

    const embed = new EmbedBuilder()
      .setColor(color as any)
      .setTitle(title);

    // Add player information
    embed.addFields(
      {
        name: '👤 Maker',
        value: `[${makerAddress}](${sapienceProfileURL}${eventData.maker})${makerCollateralDisplay ? `\n💰 Wagered: ${makerCollateralDisplay} USDC` : ''}`,
        inline: true,
      },
      {
        name: '👤 Taker', 
        value: `[${takerAddress}](${sapienceProfileURL}${eventData.taker})${takerCollateralDisplay ? `\n💰 Wagered: ${takerCollateralDisplay} USDC` : ''}`,
        inline: true,
      },
      {
        name: '💰 Total Pool',
        value: `${collateralDisplay} USDC`,
        inline: true,
      }
    );

    // Add parlay legs if available
    if (parlayLegsText) {
      // Split long legs into multiple fields if needed (Discord has 1024 char limit per field)
      const maxFieldLength = 1024;
      if (parlayLegsText.length <= maxFieldLength) {
        embed.addFields({
          name: '🎯 Parlay Predictions',
          value: parlayLegsText,
          inline: false,
        });
      } else {
        // Split into multiple fields
        const legs = parlayLegsText.split('\n');
        let currentField = '';
        let fieldIndex = 1;
        
        for (const leg of legs) {
          if ((currentField + leg + '\n').length > maxFieldLength) {
            embed.addFields({
              name: fieldIndex === 1 ? '🎯 Parlay Predictions' : `🎯 Predictions (cont.)`,
              value: currentField,
              inline: false,
            });
            currentField = leg + '\n';
            fieldIndex++;
          } else {
            currentField += leg + '\n';
          }
        }
        
        if (currentField) {
          embed.addFields({
            name: fieldIndex === 1 ? '🎯 Parlay Predictions' : `🎯 Predictions (cont.)`,
            value: currentField,
            inline: false,
          });
        }
      }
    }

    embed.addFields({
      name: '🎫 NFT Token IDs',
      value: `Maker: #${eventData.makerNftTokenId} • Taker: #${eventData.takerNftTokenId}`,
      inline: false,
    });

    // Add parlay end date if available
    if (eventData.endsAt) {
      const endDate = new Date(eventData.endsAt * 1000);
      const endDateString = endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC'
      });
      
      embed.addFields({
        name: '⏰ Parlay Ends',
        value: `${endDateString} UTC`,
        inline: false,
      });
    }

    // Add winner information for burned events
    if (eventType === 'PredictionBurned' && eventData.makerWon !== undefined) {
      embed.addFields({
        name: '🏆 Winner',
        value: eventData.makerWon ? `Maker (${makerAddress})` : `Taker (${takerAddress})`,
        inline: false,
      });
    }
    console.log('DISCORD PLAYERS')
    embed.addFields({
      name: '🔗 Transaction',
      value: getBlockExplorerUrl(chainId, eventData.transactionHash),
      inline: false,
    });

    embed.setTimestamp(new Date(eventData.timestamp * 1000));

    for (const webhookClient of webhookClients) {
      await webhookClient.send({
        embeds: [embed],
        username: 'Sapience Parlay Alerts',
        avatarURL: 'https://www.sapience.xyz/icons/icon-512x512.png',
      });
    }
  } catch (error) {
    console.error('Failed to send Discord parlay webhook alert:', error);
  }
};