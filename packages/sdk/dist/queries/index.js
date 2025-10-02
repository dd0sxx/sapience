"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// queries/index.ts
var queries_exports = {};
__export(queries_exports, {
  createGraphQLClient: () => createGraphQLClient,
  graphqlRequest: () => graphqlRequest,
  sapienceAbi: () => sapienceAbi,
  sapienceFactoryAbi: () => sapienceFactoryAbi,
  typedGraphqlRequest: () => typedGraphqlRequest,
  useLatestIndexPrice: () => useLatestIndexPrice,
  useLatestResourcePrice: () => useLatestResourcePrice,
  useMarket: () => useMarket,
  useResources: () => useResources,
  useUniswapPool: () => useUniswapPool
});
module.exports = __toCommonJS(queries_exports);

// queries/client/graphqlClient.ts
var import_graphql_request = require("graphql-request");
var getGraphQLEndpoint = () => {
  try {
    if (typeof window !== "undefined") {
      const override = window.localStorage.getItem("sapience.settings.graphqlEndpoint");
      if (override) return override;
    }
  } catch {
  }
  const baseUrl = process.env.NEXT_PUBLIC_FOIL_API_URL || "https://api.sapience.xyz";
  try {
    const u = new URL(baseUrl);
    return `${u.origin}/graphql`;
  } catch {
    return "https://api.sapience.xyz/graphql";
  }
};
var createGraphQLClient = () => new import_graphql_request.GraphQLClient(getGraphQLEndpoint());
async function graphqlRequest(query, variables) {
  try {
    const client = createGraphQLClient();
    return await client.request(query, variables);
  } catch (error) {
    console.error("GraphQL request failed:", error);
    throw error;
  }
}
async function typedGraphqlRequest(query, variables) {
  try {
    const client = createGraphQLClient();
    return await client.request(query, variables);
  } catch (error) {
    console.error("GraphQL request failed:", error);
    throw error;
  }
}

// ../protocol/deployments/Sapience.json
var Sapience_default = { abi: [
  {
    name: "facets",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [
      {
        type: "tuple[]",
        components: [
          {
            type: "address",
            name: "facetAddress"
          },
          {
            type: "bytes4[]",
            name: "functionSelectors"
          }
        ]
      }
    ]
  },
  {
    name: "facetFunctionSelectors",
    type: "function",
    stateMutability: "pure",
    inputs: [
      {
        type: "address",
        name: "facet"
      }
    ],
    outputs: [
      {
        type: "bytes4[]",
        name: "functionSelectors"
      }
    ]
  },
  {
    name: "facetAddresses",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [
      {
        type: "address[]",
        name: "addresses"
      }
    ]
  },
  {
    name: "facetAddress",
    type: "function",
    stateMutability: "pure",
    inputs: [
      {
        type: "bytes4",
        name: "functionSelector"
      }
    ],
    outputs: [
      {
        type: "address"
      }
    ]
  },
  {
    name: "emitDiamondCutEvent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [
      {
        type: "bool"
      }
    ]
  },
  {
    type: "function",
    name: "acceptOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createMarket",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.MarketCreationParams",
        components: [
          {
            name: "startTime",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "endTime",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "startingSqrtPriceX96",
            type: "uint160",
            internalType: "uint160"
          },
          {
            name: "baseAssetMinPriceTick",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "baseAssetMaxPriceTick",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "salt",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "claimStatementYesOrNumeric",
            type: "bytes",
            internalType: "bytes"
          },
          {
            name: "claimStatementNo",
            type: "bytes",
            internalType: "bytes"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "initializeMarketGroup",
    inputs: [
      {
        name: "initialOwner",
        type: "address",
        internalType: "address"
      },
      {
        name: "collateralAsset",
        type: "address",
        internalType: "address"
      },
      {
        name: "minTradeSize",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "bridgedSettlement",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "marketParams",
        type: "tuple",
        internalType: "struct ISapienceStructs.MarketParams",
        components: [
          {
            name: "feeRate",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "assertionLiveness",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "bondAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "bondCurrency",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapPositionManager",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapSwapRouter",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapQuoter",
            type: "address",
            internalType: "address"
          },
          {
            name: "optimisticOracleV3",
            type: "address",
            internalType: "address"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pendingOwner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "updateMarketGroup",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        internalType: "struct ISapienceStructs.MarketParams",
        components: [
          {
            name: "feeRate",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "assertionLiveness",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "bondAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "bondCurrency",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapPositionManager",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapSwapRouter",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapQuoter",
            type: "address",
            internalType: "address"
          },
          {
            name: "optimisticOracleV3",
            type: "address",
            internalType: "address"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "startTime",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "endTime",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "startingSqrtPriceX96",
        type: "uint160",
        indexed: false,
        internalType: "uint160"
      },
      {
        name: "claimStatementYesOrNumeric",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      },
      {
        name: "claimStatementNo",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketGroupInitialized",
    inputs: [
      {
        name: "initialOwner",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "collateralAsset",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "minTradeSize",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "bridgedSettlement",
        type: "bool",
        indexed: false,
        internalType: "bool"
      },
      {
        name: "marketParams",
        type: "tuple",
        indexed: false,
        internalType: "struct ISapienceStructs.MarketParams",
        components: [
          {
            name: "feeRate",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "assertionLiveness",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "bondAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "bondCurrency",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapPositionManager",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapSwapRouter",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapQuoter",
            type: "address",
            internalType: "address"
          },
          {
            name: "optimisticOracleV3",
            type: "address",
            internalType: "address"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketGroupUpdated",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        indexed: false,
        internalType: "struct ISapienceStructs.MarketParams",
        components: [
          {
            name: "feeRate",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "assertionLiveness",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "bondAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "bondCurrency",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapPositionManager",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapSwapRouter",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapQuoter",
            type: "address",
            internalType: "address"
          },
          {
            name: "optimisticOracleV3",
            type: "address",
            internalType: "address"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferStarted",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "EndTimeTooEarly",
    inputs: [
      {
        name: "startTime",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "endTime",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidBaseAssetMaxPriceTick",
    inputs: [
      {
        name: "maxPriceTick",
        type: "int24",
        internalType: "int24"
      },
      {
        name: "tickSpacing",
        type: "int24",
        internalType: "int24"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidBaseAssetMinPriceTick",
    inputs: [
      {
        name: "minPriceTick",
        type: "int24",
        internalType: "int24"
      },
      {
        name: "tickSpacing",
        type: "int24",
        internalType: "int24"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidBondAmount",
    inputs: [
      {
        name: "bondAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "minBond",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidFeeRate",
    inputs: [
      {
        name: "feeRate",
        type: "uint24",
        internalType: "uint24"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidInitialization",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidMarketGroup",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidPriceTickRange",
    inputs: [
      {
        name: "minPriceTick",
        type: "int24",
        internalType: "int24"
      },
      {
        name: "maxPriceTick",
        type: "int24",
        internalType: "int24"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidStartingPrice",
    inputs: [
      {
        name: "startingSqrtPriceX96",
        type: "uint160",
        internalType: "uint160"
      },
      {
        name: "minSqrtPriceX96",
        type: "uint160",
        internalType: "uint160"
      },
      {
        name: "maxSqrtPriceX96",
        type: "uint160",
        internalType: "uint160"
      }
    ]
  },
  {
    type: "error",
    name: "MarketAlreadyStarted",
    inputs: []
  },
  {
    type: "error",
    name: "MarketGroupAlreadyCreated",
    inputs: []
  },
  {
    type: "error",
    name: "MarketNotInitialized",
    inputs: []
  },
  {
    type: "error",
    name: "MathOverflowedMulDiv",
    inputs: []
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: []
  },
  {
    type: "error",
    name: "OnlyOwner",
    inputs: []
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall",
    inputs: []
  },
  {
    type: "error",
    name: "StartTimeCannotBeZero",
    inputs: []
  },
  {
    type: "error",
    name: "T",
    inputs: []
  },
  {
    type: "error",
    name: "TokensAlreadyCreated",
    inputs: []
  },
  {
    type: "function",
    name: "closeLiquidityPosition",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.LiquidityCloseParams",
        components: [
          {
            name: "positionId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "amount0Min",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "amount1Min",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "tradeSlippage",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "decreasedAmount0",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "decreasedAmount1",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "collateralAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createLiquidityPosition",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.LiquidityMintParams",
        components: [
          {
            name: "marketId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "amountBaseToken",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "amountQuoteToken",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "collateralAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "lowerTick",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "upperTick",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "minAmountBaseToken",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "minAmountQuoteToken",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "id",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "requiredCollateralAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "totalDepositedCollateralAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "uniswapNftId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "liquidity",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "addedAmount0",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "addedAmount1",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "decreaseLiquidityPosition",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.LiquidityDecreaseParams",
        components: [
          {
            name: "positionId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "liquidity",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "minBaseAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "minQuoteAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "decreasedAmount0",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "decreasedAmount1",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "collateralAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getTokensFromLiquidity",
    inputs: [
      {
        name: "liquidity",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160"
      },
      {
        name: "sqrtPriceAX96",
        type: "uint160",
        internalType: "uint160"
      },
      {
        name: "sqrtPriceBX96",
        type: "uint160",
        internalType: "uint160"
      }
    ],
    outputs: [
      {
        name: "amount0",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "amount1",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "pure"
  },
  {
    type: "function",
    name: "increaseLiquidityPosition",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.LiquidityIncreaseParams",
        components: [
          {
            name: "positionId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "collateralAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "baseTokenAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "quoteTokenAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "minBaseAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "minQuoteAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "liquidity",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "amount0",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "amount1",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "requiredCollateralAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "totalDepositedCollateralAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "quoteLiquidityPositionTokens",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "depositedCollateralAmount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160"
      },
      {
        name: "sqrtPriceAX96",
        type: "uint160",
        internalType: "uint160"
      },
      {
        name: "sqrtPriceBX96",
        type: "uint160",
        internalType: "uint160"
      }
    ],
    outputs: [
      {
        name: "amount0",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "amount1",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "liquidity",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "quoteRequiredCollateral",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "liquidity",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    outputs: [
      {
        name: "requiredCollateral",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "LiquidityPositionClosed",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "kind",
        type: "uint8",
        indexed: false,
        internalType: "enum ISapienceStructs.PositionKind"
      },
      {
        name: "collectedAmount0",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "collectedAmount1",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "loanAmount0",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "loanAmount1",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVquoteAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVbaseAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVquote",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVbase",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "deltaCollateral",
        type: "int256",
        indexed: false,
        internalType: "int256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "LiquidityPositionCreated",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "liquidity",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "addedAmount0",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "addedAmount1",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "lowerTick",
        type: "int24",
        indexed: false,
        internalType: "int24"
      },
      {
        name: "upperTick",
        type: "int24",
        indexed: false,
        internalType: "int24"
      },
      {
        name: "positionCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVquoteAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVbaseAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVquote",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVbase",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "deltaCollateral",
        type: "int256",
        indexed: false,
        internalType: "int256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "LiquidityPositionDecreased",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "requiredCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "liquidity",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "decreasedAmount0",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "decreasedAmount1",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "loanAmount0",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "loanAmount1",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVquoteAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVbaseAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVquote",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVbase",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "deltaCollateral",
        type: "int256",
        indexed: false,
        internalType: "int256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "LiquidityPositionIncreased",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "requiredCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "liquidity",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "increasedAmount0",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "increasedAmount1",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "loanAmount0",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "loanAmount1",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVquoteAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVbaseAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVquote",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVbase",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "deltaCollateral",
        type: "int256",
        indexed: false,
        internalType: "int256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TraderPositionModified",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "requiredCollateral",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "initialPrice",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "finalPrice",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "tradeRatio",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVquoteAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVbaseAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVquote",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVbase",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "deltaCollateral",
        type: "int256",
        indexed: false,
        internalType: "int256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "tokenId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "AddressEmptyCode",
    inputs: [
      {
        name: "target",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "AddressInsufficientBalance",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "CollateralLimitReached",
    inputs: [
      {
        name: "collateralRequired",
        type: "int256",
        internalType: "int256"
      },
      {
        name: "maxCollateral",
        type: "int256",
        internalType: "int256"
      }
    ]
  },
  {
    type: "error",
    name: "ExpiredMarket",
    inputs: []
  },
  {
    type: "error",
    name: "FailedInnerCall",
    inputs: []
  },
  {
    type: "error",
    name: "InsufficientCollateral",
    inputs: [
      {
        name: "amountRequired",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "collateralAvailable",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidData",
    inputs: [
      {
        name: "message",
        type: "string",
        internalType: "string"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidInternalTradeSize",
    inputs: [
      {
        name: "tradeSize",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidMarket",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidParameter",
    inputs: [
      {
        name: "parameter",
        type: "string",
        internalType: "string"
      },
      {
        name: "reason",
        type: "string",
        internalType: "string"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidPositionId",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidPositionKind",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidRange",
    inputs: [
      {
        name: "requestedTick",
        type: "int24",
        internalType: "int24"
      },
      {
        name: "boundedTick",
        type: "int24",
        internalType: "int24"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidSlippage",
    inputs: [
      {
        name: "liquiditySlippage",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "tradeSlippage",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidTransferRecipient",
    inputs: [
      {
        name: "recipient",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "NotAccountOwner",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "sender",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "OverflowInt256ToUint256",
    inputs: []
  },
  {
    type: "error",
    name: "OverflowUint256ToInt256",
    inputs: []
  },
  {
    type: "error",
    name: "PoolPriceOutOfRange",
    inputs: [
      {
        name: "poolPrice",
        type: "uint160",
        internalType: "uint160"
      },
      {
        name: "minPrice",
        type: "uint160",
        internalType: "uint160"
      },
      {
        name: "maxPrice",
        type: "uint160",
        internalType: "uint160"
      }
    ]
  },
  {
    type: "error",
    name: "PositionAlreadyCreated",
    inputs: []
  },
  {
    type: "error",
    name: "PositionAlreadySettled",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "SwapFailed",
    inputs: [
      {
        name: "reason",
        type: "bytes",
        internalType: "bytes"
      }
    ]
  },
  {
    type: "error",
    name: "TokenAlreadyMinted",
    inputs: [
      {
        name: "id",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "TradePriceOutOfBounds",
    inputs: [
      {
        name: "tradeRatioD18",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "minTradeRatioD18",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "maxTradeRatioD18",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: []
  },
  {
    type: "function",
    name: "assertionDisputedCallback",
    inputs: [
      {
        name: "assertionId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "assertionResolvedCallback",
    inputs: [
      {
        name: "assertionId",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "assertedTruthfully",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "submitSettlementPrice",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.SettlementPriceParams",
        components: [
          {
            name: "marketId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "asserter",
            type: "address",
            internalType: "address"
          },
          {
            name: "settlementSqrtPriceX96",
            type: "uint160",
            internalType: "uint160"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "MarketSettled",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "assertionId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      },
      {
        name: "settlementSqrtPriceX96",
        type: "uint160",
        indexed: false,
        internalType: "uint160"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SettlementDisputed",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "disputeTime",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SettlementSubmitted",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "asserter",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "settlementSqrtPriceX96",
        type: "uint160",
        indexed: false,
        internalType: "uint160"
      },
      {
        name: "submissionTime",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "function",
    name: "createTraderPosition",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.TraderPositionCreateParams",
        components: [
          {
            name: "marketId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "size",
            type: "int256",
            internalType: "int256"
          },
          {
            name: "maxCollateral",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "modifyTraderPosition",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.TraderPositionModifyParams",
        components: [
          {
            name: "positionId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "size",
            type: "int256",
            internalType: "int256"
          },
          {
            name: "deltaCollateralLimit",
            type: "int256",
            internalType: "int256"
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "quoteCreateTraderPosition",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "size",
        type: "int256",
        internalType: "int256"
      }
    ],
    outputs: [
      {
        name: "requiredCollateral",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "fillPrice",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "price18DigitsAfter",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "quoteModifyTraderPosition",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "size",
        type: "int256",
        internalType: "int256"
      }
    ],
    outputs: [
      {
        name: "expectedCollateralDelta",
        type: "int256",
        internalType: "int256"
      },
      {
        name: "closePnL",
        type: "int256",
        internalType: "int256"
      },
      {
        name: "fillPrice",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "price18DigitsAfter",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "TraderPositionCreated",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "requiredCollateral",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "initialPrice",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "finalPrice",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "tradeRatio",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVquoteAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVbaseAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVquote",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVbase",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "deltaCollateral",
        type: "int256",
        indexed: false,
        internalType: "int256"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "CollateralBelowMin",
    inputs: [
      {
        name: "collateralRequired",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "minCollateral",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "DeltaTradeIsZero",
    inputs: []
  },
  {
    type: "error",
    name: "ExpiredMarketNotSettled",
    inputs: [
      {
        name: "marketEndTime",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "MarketSettled",
    inputs: []
  },
  {
    type: "error",
    name: "PositionSizeBelowMin",
    inputs: []
  },
  {
    type: "error",
    name: "TransactionExpired",
    inputs: [
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "blockTime",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      {
        name: "to",
        type: "address",
        internalType: "address"
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      {
        name: "holder",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "balance",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getApproved",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "operator",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isApprovedForAll",
    inputs: [
      {
        name: "holder",
        type: "address",
        internalType: "address"
      },
      {
        name: "operator",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "safeTransferFrom",
    inputs: [
      {
        name: "from",
        type: "address",
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        internalType: "address"
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "safeTransferFrom",
    inputs: [
      {
        name: "from",
        type: "address",
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        internalType: "address"
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "data",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      {
        name: "operator",
        type: "address",
        internalType: "address"
      },
      {
        name: "approved",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "tokenByIndex",
    inputs: [
      {
        name: "index",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address"
      },
      {
        name: "index",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      {
        name: "from",
        type: "address",
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        internalType: "address"
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "approved",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "tokenId",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ApprovalForAll",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "operator",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "approved",
        type: "bool",
        indexed: false,
        internalType: "bool"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "CannotSelfApprove",
    inputs: [
      {
        name: "addr",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "IndexOverrun",
    inputs: [
      {
        name: "requestedIndex",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "length",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidOwner",
    inputs: [
      {
        name: "addr",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidTransferRecipient",
    inputs: [
      {
        name: "addr",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "error",
    name: "TokenDoesNotExist",
    inputs: [
      {
        name: "id",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "Unauthorized",
    inputs: [
      {
        name: "addr",
        type: "address",
        internalType: "address"
      }
    ]
  },
  {
    type: "function",
    name: "getDecimalPriceFromSqrtPriceX96",
    inputs: [
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "pure"
  },
  {
    type: "function",
    name: "getLatestMarket",
    inputs: [],
    outputs: [
      {
        name: "marketData",
        type: "tuple",
        internalType: "struct ISapienceStructs.MarketData",
        components: [
          {
            name: "marketId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "startTime",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "endTime",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "pool",
            type: "address",
            internalType: "address"
          },
          {
            name: "quoteToken",
            type: "address",
            internalType: "address"
          },
          {
            name: "baseToken",
            type: "address",
            internalType: "address"
          },
          {
            name: "minPriceD18",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "maxPriceD18",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "baseAssetMinPriceTick",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "baseAssetMaxPriceTick",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "settled",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "settlementPriceD18",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "assertionId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "claimStatementYesOrNumeric",
            type: "bytes",
            internalType: "bytes"
          },
          {
            name: "claimStatementNo",
            type: "bytes",
            internalType: "bytes"
          }
        ]
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.MarketParams",
        components: [
          {
            name: "feeRate",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "assertionLiveness",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "bondAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "bondCurrency",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapPositionManager",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapSwapRouter",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapQuoter",
            type: "address",
            internalType: "address"
          },
          {
            name: "optimisticOracleV3",
            type: "address",
            internalType: "address"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getMarket",
    inputs: [
      {
        name: "id",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "marketData",
        type: "tuple",
        internalType: "struct ISapienceStructs.MarketData",
        components: [
          {
            name: "marketId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "startTime",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "endTime",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "pool",
            type: "address",
            internalType: "address"
          },
          {
            name: "quoteToken",
            type: "address",
            internalType: "address"
          },
          {
            name: "baseToken",
            type: "address",
            internalType: "address"
          },
          {
            name: "minPriceD18",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "maxPriceD18",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "baseAssetMinPriceTick",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "baseAssetMaxPriceTick",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "settled",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "settlementPriceD18",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "assertionId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "claimStatementYesOrNumeric",
            type: "bytes",
            internalType: "bytes"
          },
          {
            name: "claimStatementNo",
            type: "bytes",
            internalType: "bytes"
          }
        ]
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ISapienceStructs.MarketParams",
        components: [
          {
            name: "feeRate",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "assertionLiveness",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "bondAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "bondCurrency",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapPositionManager",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapSwapRouter",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapQuoter",
            type: "address",
            internalType: "address"
          },
          {
            name: "optimisticOracleV3",
            type: "address",
            internalType: "address"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getMarketGroup",
    inputs: [],
    outputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address"
      },
      {
        name: "collateralAsset",
        type: "address",
        internalType: "address"
      },
      {
        name: "marketParams",
        type: "tuple",
        internalType: "struct ISapienceStructs.MarketParams",
        components: [
          {
            name: "feeRate",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "assertionLiveness",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "bondAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "bondCurrency",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapPositionManager",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapSwapRouter",
            type: "address",
            internalType: "address"
          },
          {
            name: "uniswapQuoter",
            type: "address",
            internalType: "address"
          },
          {
            name: "optimisticOracleV3",
            type: "address",
            internalType: "address"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getMarketGroupTickSpacing",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "int24",
        internalType: "int24"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPosition",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Position.Data",
        components: [
          {
            name: "id",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "kind",
            type: "uint8",
            internalType: "enum ISapienceStructs.PositionKind"
          },
          {
            name: "marketId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "depositedCollateralAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "borrowedVQuote",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "borrowedVBase",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "vQuoteAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "vBaseAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "uniswapPositionId",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "isSettled",
            type: "bool",
            internalType: "bool"
          }
        ]
      }
    ],
    stateMutability: "pure"
  },
  {
    type: "function",
    name: "getPositionCollateralValue",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "collateralValue",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPositionPnl",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "pnl",
        type: "int256",
        internalType: "int256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPositionSize",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "int256",
        internalType: "int256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getReferencePrice",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "price18Digits",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getSqrtPriceX96",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "error",
    name: "NoMarketsCreated",
    inputs: []
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [
      {
        name: "interfaceId",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "settlePosition",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "withdrawnCollateral",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "PositionSettled",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "withdrawnCollateral",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionCollateralAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVquoteAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionVbaseAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVquote",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionBorrowedVbase",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "deltaCollateral",
        type: "int256",
        indexed: false,
        internalType: "int256"
      },
      {
        name: "marketId",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "positionOwner",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "MarketNotSettled",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  }
] };

// ../protocol/deployments/SapienceFactory.json
var SapienceFactory_default = {
  abi: [
    {
      type: "constructor",
      inputs: [
        {
          name: "_implementation",
          type: "address",
          internalType: "address"
        }
      ],
      stateMutability: "nonpayable"
    },
    {
      type: "function",
      name: "cloneAndInitializeMarketGroup",
      inputs: [
        {
          name: "collateralAsset",
          type: "address",
          internalType: "address"
        },
        {
          name: "minTradeSize",
          type: "uint256",
          internalType: "uint256"
        },
        {
          name: "bridgedSettlement",
          type: "bool",
          internalType: "bool"
        },
        {
          name: "marketParams",
          type: "tuple",
          internalType: "struct ISapienceStructs.MarketParams",
          components: [
            {
              name: "feeRate",
              type: "uint24",
              internalType: "uint24"
            },
            {
              name: "assertionLiveness",
              type: "uint64",
              internalType: "uint64"
            },
            {
              name: "bondAmount",
              type: "uint256",
              internalType: "uint256"
            },
            {
              name: "bondCurrency",
              type: "address",
              internalType: "address"
            },
            {
              name: "uniswapPositionManager",
              type: "address",
              internalType: "address"
            },
            {
              name: "uniswapSwapRouter",
              type: "address",
              internalType: "address"
            },
            {
              name: "uniswapQuoter",
              type: "address",
              internalType: "address"
            },
            {
              name: "optimisticOracleV3",
              type: "address",
              internalType: "address"
            }
          ]
        },
        {
          name: "nonce",
          type: "uint256",
          internalType: "uint256"
        }
      ],
      outputs: [
        {
          name: "",
          type: "address",
          internalType: "address"
        }
      ],
      stateMutability: "nonpayable"
    },
    {
      type: "function",
      name: "implementation",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "address",
          internalType: "address"
        }
      ],
      stateMutability: "view"
    },
    {
      type: "event",
      name: "MarketGroupDeployed",
      inputs: [
        {
          name: "sender",
          type: "address",
          indexed: true,
          internalType: "address"
        },
        {
          name: "marketGroup",
          type: "address",
          indexed: true,
          internalType: "address"
        },
        {
          name: "nonce",
          type: "uint256",
          indexed: false,
          internalType: "uint256"
        }
      ],
      anonymous: false
    },
    {
      type: "error",
      name: "ERC1167FailedCreateClone",
      inputs: []
    }
  ]
};

// queries/client/abi.ts
var sapienceAbi = () => {
  const abi = Sapience_default.abi;
  return { abi };
};
var sapienceFactoryAbi = () => {
  const abi = SapienceFactory_default.abi;
  return { abi };
};

// queries/hooks/resources/useResources.ts
var import_react_query = require("@tanstack/react-query");

// types/resources.ts
var RESOURCE_ORDER = [
  "ethereum-gas",
  "base-gas",
  "arbitrum-gas",
  "ethereum-blobspace",
  "celestia-blobspace",
  "bitcoin-fees"
];

// queries/hooks/resources/useResources.ts
var LATEST_RESOURCE_PRICE_QUERY = (
  /* GraphQL */
  `
  query LatestResourcePrice($slug: String!, $from: Int!, $to: Int!, $interval: Int!) {
    resourceCandles(slug: $slug, from: $from, to: $to, interval: $interval) {
      data { timestamp close }
      lastUpdateTimestamp
    }
  }
`
);
var LATEST_INDEX_PRICE_QUERY = (
  /* GraphQL */
  `
  query LatestIndexPrice($address: String!, $chainId: Int!, $marketId: String!, $from: Int!, $to: Int!, $interval: Int!) {
    indexCandles(address: $address, chainId: $chainId, marketId: $marketId, from: $from, to: $to, interval: $interval) {
      data { timestamp close }
      lastUpdateTimestamp
    }
  }
`
);
var RESOURCES_QUERY = (
  /* GraphQL */
  `
  query Resources {
    resources {
      id
      name
      slug
      marketGroups {
        id
        address
        isBridged
        chainId
        markets { id marketId startTimestamp endTimestamp public question }
      }
    }
  }
`
);
var useResources = () => {
  return (0, import_react_query.useQuery)({
    queryKey: ["resources"],
    queryFn: async () => {
      const data = await graphqlRequest(RESOURCES_QUERY);
      const resources = data.resources.sort((a, b) => {
        const indexA = RESOURCE_ORDER.indexOf(a.slug);
        const indexB = RESOURCE_ORDER.indexOf(b.slug);
        return indexA - indexB;
      });
      return resources.map((resource) => ({
        ...resource,
        iconPath: `/resources/${resource.slug}.svg`
      }));
    }
  });
};
var useLatestResourcePrice = (slug) => {
  return (0, import_react_query.useQuery)({
    queryKey: ["resourcePrice", slug],
    queryFn: async () => {
      const from = Math.floor(Date.now() / 1e3) - 300;
      const to = Math.floor(Date.now() / 1e3);
      const interval = 60;
      const data = await graphqlRequest(LATEST_RESOURCE_PRICE_QUERY, { slug, from, to, interval });
      const candles = data.resourceCandles.data;
      if (!candles || candles.length === 0) throw new Error("No price data found");
      const latestCandle = candles.reduce((latest, current) => {
        if (!latest || current.timestamp > latest.timestamp) return current;
        return latest;
      }, null);
      if (!latestCandle) throw new Error("No price data found");
      return { timestamp: latestCandle.timestamp.toString(), value: latestCandle.close };
    },
    refetchInterval: 15e3
  });
};
var useLatestIndexPrice = (market) => {
  return (0, import_react_query.useQuery)({
    queryKey: ["indexPrice", `${market.chainId}:${market.address}`, market.marketId],
    queryFn: async () => {
      if (!market.address || !market.chainId || market.marketId === 0) return null;
      const from = Math.floor(Date.now() / 1e3) - 300;
      const to = Math.floor(Date.now() / 1e3);
      const interval = 60;
      const data = await graphqlRequest(LATEST_INDEX_PRICE_QUERY, {
        address: market.address,
        chainId: market.chainId,
        marketId: market.marketId.toString(),
        from,
        to,
        interval
      });
      const candles = data.indexCandles.data;
      if (!candles || candles.length === 0) throw new Error("No index price data found");
      const latestCandle = candles.reduce((latest, current) => {
        if (!latest || current.timestamp > latest.timestamp) return current;
        return latest;
      }, null);
      if (!latestCandle) throw new Error("No index price data found");
      return { timestamp: latestCandle.timestamp.toString(), value: latestCandle.close };
    },
    refetchInterval: 15e3,
    enabled: !!market.address && !!market.chainId && market.marketId !== 0
  });
};

// queries/hooks/market/useMarket.ts
var import_react = require("react");
var import_wagmi = require("wagmi");

// ui/hooks/use-toast.ts
var React = __toESM(require("react"));
var TOAST_LIMIT = 1;
var TOAST_REMOVE_DELAY = 1e6;
var count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}
var toastTimeouts = /* @__PURE__ */ new Map();
var addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId
    });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
};
var reducer = (state, action) => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT)
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map(
          (t) => t.id === action.toast.id ? { ...t, ...action.toast } : t
        )
      };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toastArg) => {
          addToRemoveQueue(toastArg.id);
        });
      }
      return {
        ...state,
        toasts: state.toasts.map(
          (t) => t.id === toastId || toastId === void 0 ? {
            ...t,
            open: false
          } : t
        )
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === void 0) {
        return {
          ...state,
          toasts: []
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId)
      };
    default:
      return state;
  }
};
var listeners = [];
var memoryState = { toasts: [] };
function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}
function toast({ ...props }) {
  const id = genId();
  const defaultStyle = {
    maxWidth: "500px",
    width: "100%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    flexDirection: "column",
    overflowY: "scroll"
  };
  const update = (propsArg) => dispatch({
    type: "UPDATE_TOAST",
    toast: { ...propsArg, id }
  });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      style: {
        ...defaultStyle,
        ...props.style
      },
      onOpenChange: (open) => {
        if (!open) dismiss();
      }
    }
  });
  return {
    id,
    dismiss,
    update
  };
}
function useToast() {
  const [state, setState] = React.useState(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);
  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: "DISMISS_TOAST", toastId })
  };
}

// queries/hooks/market/useMarket.ts
function useMarket({ marketAddress, marketId, abi }) {
  const { toast: toast2 } = useToast();
  const { data, isLoading, isError, error: contractError } = (0, import_wagmi.useReadContract)({
    address: marketAddress,
    abi,
    chainId: 8453,
    functionName: "getMarket",
    args: [marketId]
  });
  (0, import_react.useEffect)(() => {
    if (isError && contractError) {
      toast2({
        title: "Error loading market data",
        description: contractError.message,
        variant: "destructive"
      });
    }
  }, [isError, contractError, toast2]);
  const result = data;
  const marketData = result?.[0];
  const marketGroupParams = result?.[1];
  return { marketData, marketGroupParams, isLoading, error: contractError };
}

// queries/hooks/uniswap/useUniswapPool.ts
var import_sdk_core = require("@uniswap/sdk-core");
var import_IUniswapV3Pool = __toESM(require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json"));
var import_v3_sdk = require("@uniswap/v3-sdk");
var import_react2 = require("react");
var import_wagmi2 = require("wagmi");

// queries/abis/erc20abi.json
var erc20abi_default = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [
      {
        name: "",
        type: "string"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        name: "_spender",
        type: "address"
      },
      {
        name: "_value",
        type: "uint256"
      }
    ],
    name: "approve",
    outputs: [
      {
        name: "",
        type: "bool"
      }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        name: "",
        type: "uint256"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        name: "_from",
        type: "address"
      },
      {
        name: "_to",
        type: "address"
      },
      {
        name: "_value",
        type: "uint256"
      }
    ],
    name: "transferFrom",
    outputs: [
      {
        name: "",
        type: "bool"
      }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        name: "",
        type: "uint8"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address"
      }
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "balance",
        type: "uint256"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        name: "",
        type: "string"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      {
        name: "_to",
        type: "address"
      },
      {
        name: "_value",
        type: "uint256"
      }
    ],
    name: "transfer",
    outputs: [
      {
        name: "",
        type: "bool"
      }
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address"
      },
      {
        name: "_spender",
        type: "address"
      }
    ],
    name: "allowance",
    outputs: [
      {
        name: "",
        type: "uint256"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    payable: true,
    stateMutability: "payable",
    type: "fallback"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        name: "spender",
        type: "address"
      },
      {
        indexed: false,
        name: "value",
        type: "uint256"
      }
    ],
    name: "Approval",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        name: "to",
        type: "address"
      },
      {
        indexed: false,
        name: "value",
        type: "uint256"
      }
    ],
    name: "Transfer",
    type: "event"
  }
];

// queries/hooks/uniswap/useUniswapPool.ts
var REFETCH_INTERVAL = 6e4;
var useUniswapPool = (chainId, poolAddress) => {
  const [pool, setPool] = (0, import_react2.useState)(null);
  const [liquidity, setLiquidity] = (0, import_react2.useState)("0");
  const { data, isError, isLoading } = (0, import_wagmi2.useReadContracts)({
    contracts: [
      { address: poolAddress, abi: import_IUniswapV3Pool.default.abi, functionName: "token0", chainId },
      { address: poolAddress, abi: import_IUniswapV3Pool.default.abi, functionName: "token1", chainId },
      { address: poolAddress, abi: import_IUniswapV3Pool.default.abi, functionName: "fee", chainId },
      { address: poolAddress, abi: import_IUniswapV3Pool.default.abi, functionName: "liquidity", chainId },
      { address: poolAddress, abi: import_IUniswapV3Pool.default.abi, functionName: "slot0", chainId }
    ]
  });
  const { data: token0Balance, refetch: refetchTokenBalance, isRefetching: isRefetchingUniswap } = (0, import_wagmi2.useReadContract)({
    address: data?.[0].result,
    abi: erc20abi_default,
    functionName: "balanceOf",
    args: [poolAddress],
    chainId,
    query: { enabled: !!data?.[0]?.result, refetchInterval: REFETCH_INTERVAL }
  });
  (0, import_react2.useEffect)(() => {
    if (data && token0Balance !== void 0) {
      const token0Address = data[0].result;
      const token1Address = data[1].result;
      const fee = data[2].result;
      const uniswapLiquidity = data[3].result;
      const slot0 = data[4].result;
      if (token0Address && token1Address) {
        const [sqrtPriceX96, tick] = slot0;
        const token0 = new import_sdk_core.Token(chainId, token0Address, 18, "Ggas", "Ggas");
        const token1 = new import_sdk_core.Token(chainId, token1Address, 18, "wstETH", "wstETH");
        const poolInstance = new import_v3_sdk.Pool(token0, token1, fee, sqrtPriceX96.toString(), uniswapLiquidity.toString(), tick);
        setPool(poolInstance);
        const formattedToken0Balance = (Number(token0Balance) / 10 ** token0.decimals).toFixed(4);
        setLiquidity(formattedToken0Balance);
      }
    }
  }, [data, token0Balance, chainId]);
  const refetchUniswapData = (0, import_react2.useCallback)(() => {
    if (!isRefetchingUniswap) refetchTokenBalance();
  }, [isRefetchingUniswap, refetchTokenBalance]);
  return { pool, liquidity, isError, isLoading, refetchUniswapData };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createGraphQLClient,
  graphqlRequest,
  sapienceAbi,
  sapienceFactoryAbi,
  typedGraphqlRequest,
  useLatestIndexPrice,
  useLatestResourcePrice,
  useMarket,
  useResources,
  useUniswapPool
});
