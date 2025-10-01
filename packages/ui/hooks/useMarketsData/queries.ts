/**
 * GraphQL queries for markets data
 * Centralized location for all GraphQL queries used by useMarketsData
 */

export const GET_CATEGORIES = /* GraphQL */ `
  query Categories {
    categories {
      id
      name
      slug
      marketGroups {
        id
      }
    }
  }
`;

export const GET_CONDITIONS = /* GraphQL */ `
  query Conditions($take: Int, $skip: Int) {
    conditions(orderBy: { createdAt: desc }, take: $take, skip: $skip) {
      id
      createdAt
      question
      shortName
      endTime
      public
      claimStatement
      description
      similarMarkets
      category {
        id
        name
        slug
      }
    }
  }
`;

export const MARKETS_QUERY = /* GraphQL */ `
  query Markets {
    marketGroups {
      id
      address
      chainId
      owner
      collateralAsset
      question
      rules
      baseTokenName
      quoteTokenName
      factoryAddress
      initializationNonce
      minTradeSize
      collateralDecimals
      collateralSymbol
      deployTimestamp
      deployTxnBlockNumber
      isCumulative
      isBridged
      resource {
        id
        name
        slug
      }
      marketParamsFeerate
      marketParamsAssertionliveness
      marketParamsBondcurrency
      marketParamsBondamount
      marketParamsUniswappositionmanager
      marketParamsUniswapswaprouter
      marketParamsUniswapquoter
      marketParamsOptimisticoraclev3
      category {
        id
        name
        slug
      }
      markets {
        id
        marketId
        startTimestamp
        endTimestamp
        settled
        public
        question
        shortName
        poolAddress
        settlementPriceD18
        optionName
        baseAssetMinPriceTick
        baseAssetMaxPriceTick
        startingSqrtPriceX96
        marketParamsFeerate
        marketParamsAssertionliveness
        marketParamsBondcurrency
        marketParamsBondamount
        claimStatementYesOrNumeric
        claimStatementNo
        marketParamsUniswappositionmanager
        marketParamsUniswapswaprouter
        marketParamsUniswapquoter
        marketParamsOptimisticoraclev3
      }
    }
  }
`;
