import { Response, Router } from 'express';
import { handleAsyncErrors } from '../helpers/handleAsyncErrors';
import prisma from '../db';

const router = Router();

router.get(
  '/',
  handleAsyncErrors(async (_, res: Response) => {
    const markets = await prisma.marketGroup.findMany({
      include: {
        market: true,
        resource: true,
        category: true,
      },
    });

    const formattedMarkets = markets.map((marketGroup) => ({
      ...marketGroup,
      markets: marketGroup.markets.map((market) => ({
        ...market,
        startTimestamp: Number(market.startTimestamp),
        endTimestamp: Number(market.endTimestamp),
        question: market.question,
      })),
    }));

    res.json(formattedMarkets);
  })
);

export { router };
