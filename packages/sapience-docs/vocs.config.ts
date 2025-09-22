import { defineConfig } from 'vocs'

export default defineConfig({
  title: 'Sapience',
  logoUrl: {
    light: '/sapience.svg',
    dark: '/sapience-dark.svg',
  },
  theme: {
    accentColor: {
      backgroundAccent: {
        light: 'rgba(145, 179, 240, 0.2)',
        dark: 'rgba(145, 179, 240, 0.2)',
      },
      backgroundAccentHover: {
        light: 'rgba(145, 179, 240, 0.3)',
        dark: 'rgba(145, 179, 240, 0.3)',
      },
      backgroundAccentText: {
        light: 'black',
        dark: 'white',
      },
      borderAccent: {
        light: 'rgba(145, 179, 240, 0.8)',
        dark: 'rgba(145, 179, 240, 0.8)',
      },
      textAccent: {
        light: '#91B3F0',
        dark: '#91B3F0',
      },
      textAccentHover: {
        light: '#7AA1EE',
        dark: '#7AA1EE',
      },
    },
  },
  sidebar: [
    {
      text: 'Getting Started',
      items: [
        { text: 'What is Sapience?', link: '/getting-started/what-is-sapience' },
        { text: 'Quickstart', link: '/getting-started/quickstart' },
      ],
    },
    {
      text: 'Builder Guides',
      items: [
        { text: 'Forecasting Agent', link: '/guides/forecasting-agent' },
        { text: 'Prediction Market Trading Bot', link: '/guides/trading-bots' },
        { text: 'Liquidity Provisioning Bot', link: '/guides/liquidity-provisioning-bots' },
        { text: 'Batch Auction Market Bot', link: '/guides/trading-auction-intent-markets' },
        { text: 'Custom Trading App', link: '/guides/custom-trading-app' },
        { text: 'Dashboards, Games, and more', link: '/guides/design-dashboards-games' },
      ],
    },
    {
      text: 'Core Concepts',
      items: [
        { text: 'Market Types', link: '/concepts/market-types' },
        { text: 'Oracles & Settlement', link: '/concepts/oracles-and-settlement' },
      ],
    },
    {
      text: 'API',
      items: [
        {
          text: 'GraphQL',
          link: '/api/graphql',
        },
        {
          text: 'Quoter',
          link: '/api/quoter',
        },
        {
          text: 'Batch Auction Relayer',
          link: '/api/auction-relayer',
        },
        { text: 'MCP', link: '/api/mcp' },
      ],
    },
    
    {
      text: 'Reference',
      items: [
        { text: 'Contracts & Addresses', link: '/reference/contracts-and-addresses' },
        { text: 'GraphQL Schema', link: '/reference/graphql-schema' },
        { text: 'Batch Auction Relayer', link: '/reference/auction-relayer' },
        // MCP Endpoints consolidated into API → MCP
      ],
    },
    { text: 'FAQ', link: '/faq' },
    { text: 'Contributing', link: '/contributing' },
  ],
})
