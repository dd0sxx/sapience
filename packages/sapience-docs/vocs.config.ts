import { defineConfig } from "vocs";

export default defineConfig({
  title: "Sapience",
  logoUrl: {
    light: "/sapience.svg",
    dark: "/sapience-dark.svg",
  },
  topNav: [],
  banner: {
    dismissable: "false" as unknown as boolean,
    backgroundColor: "#0588f0",
    textColor: "white",
    height: "40px",
    content:
      "Docs are heavily under construction. Some information is incorrect. Share feedback in [Discord](https://discord.gg/sapience).",
  },
  head: [
    ["link", { rel: "stylesheet", href: "/styles.css" }],
  ] as any,
  theme: {
    accentColor: {
      backgroundAccent: {
        light: "rgba(145, 179, 240, 0.2)",
        dark: "rgba(145, 179, 240, 0.2)",
      },
      backgroundAccentHover: {
        light: "rgba(145, 179, 240, 0.3)",
        dark: "rgba(145, 179, 240, 0.3)",
      },
      backgroundAccentText: {
        light: "black",
        dark: "white",
      },
      borderAccent: {
        light: "rgba(145, 179, 240, 0.8)",
        dark: "rgba(145, 179, 240, 0.8)",
      },
      textAccent: {
        light: "#91B3F0",
        dark: "#91B3F0",
      },
      textAccentHover: {
        light: "#7AA1EE",
        dark: "#7AA1EE",
      },
    },
  },
  sidebar: {
    "/": [
      { text: "Open App", link: "https://sapience.xyz" },
      { text: "User Guide", link: "/user-guide/introduction/what-is-sapience", match: "/user-guide" as any },
      { text: "Builder Guide", link: "/builder-guide/getting-started/quickstart", match: "/builder-guide" as any },
      {
        text: "Build Something Awesome",
        items: [
          { text: "Quickstart", link: "/builder-guide/getting-started/quickstart" },
          { text: "Forecasting Agent", link: "/builder-guide/guides/forecasting-agent" },
          {
            text: "Prediction Market Trading Bot",
            link: "/builder-guide/guides/trading-bots",
          },
          {
            text: "Liquidity Provisioning Bot",
            link: "/builder-guide/guides/liquidity-provisioning-bots",
          },
          {
            text: "Batch Auction Market Bot",
            link: "/builder-guide/guides/trading-auction-intent-markets",
          },
          { text: "Custom Trading App", link: "/builder-guide/guides/custom-trading-app" },
          {
            text: "Dashboards, Games, and more",
            link: "/builder-guide/guides/design-dashboards-games",
          },
        ],
      },
      {
        text: "API",
        items: [
          { text: "GraphQL", link: "/builder-guide/api/graphql" },
          { text: "Quoter", link: "/builder-guide/api/quoter" },
          { text: "Batch Auction Relayer", link: "/builder-guide/api/auction-relayer" },
          { text: "MCP", link: "/builder-guide/api/mcp" },
        ],
      },
      {
        text: "Reference",
        items: [
          {
            text: "Contracts & Addresses",
            link: "/builder-guide/reference/contracts-and-addresses",
          },
          { text: "GraphQL Schema", link: "/builder-guide/reference/graphql-schema" },
          { text: "Batch Auction Relayer", link: "/builder-guide/reference/auction-relayer" },
          {
            text: "Oracles & Settlement",
            link: "/builder-guide/reference/oracles-and-settlement",
          },
          { text: "UI components", link: "/builder-guide/storybook" },
        ],
      },
      { text: "FAQ", link: "/builder-guide/faq" },
      { text: "Contributing", link: "/builder-guide/contributing" },
    ],
    "/user-guide": [
      { text: "Open App", link: "https://sapience.xyz" },
      { text: "User Guide", link: "/user-guide/introduction/what-is-sapience", match: "/user-guide" as any },
      { text: "Builder Guide", link: "/builder-guide/getting-started/quickstart", match: "/builder-guide" as any },
      {
        text: "Introduction",
        items: [
          {
            text: "What is Sapience?",
            link: "/user-guide/introduction/what-is-sapience",
          },
          {
            text: "Glossary",
            link: "/user-guide/other-resources/glossary",
          },
        ],
      },
      {
        text: "Trading on Sapience",
        items: [
          { text: "Overview", link: "/user-guide/trading/overview" },
          { text: "Market Types", link: "/user-guide/trading/market-types" },
          {
            text: "Market Lifecycle",
            link: "/user-guide/trading/market-lifecycle",
          },
          {
            text: "Pricing & Order Types",
            link: "/user-guide/trading/pricing-and-order-types",
          },
          {
            text: "Resolution & Disputes",
            link: "/user-guide/trading/resolution-and-disputes",
          },
        ],
      },
      {
        text: "Liquidity Provisioning",
        items: [
          { text: "Overview", link: "/user-guide/liquidity-provisioning" },
          {
            text: "Tutorial",
            link: "/user-guide/liquidity-provisioning/tutorial",
          },
        ],
      },
      {
        text: "Deposits & Withdrawals",
        items: [
          { text: "Overview", link: "/user-guide/deposits-and-withdrawals" },
        ],
      },
      {
        text: "Risks & Safeguards",
        items: [{ text: "Overview", link: "/user-guide/risks-and-safeguards" }],
      },
      {
        text: "Fees & Incentives",
        items: [{ text: "Overview", link: "/user-guide/fees-and-incentives" }],
      },
      {
        text: "Other Resources",
        items: [
          { text: "Audits", link: "/user-guide/other-resources/audits" },
          {
            text: "Brand Assets",
            link: "/user-guide/other-resources/brand-assets",
          },
          {
            text: "Community",
            link: "/user-guide/other-resources/community",
          },
          { text: "FAQ", link: "/user-guide/other-resources/faq" },
        ],
      },
    ],
  },
} as any);
