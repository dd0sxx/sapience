# Query Complexity Issues Found

## 🚨 Critical Issues

### 1. **MARKETS_QUERY in useMarketGroups.ts** (Lines 108-175)

**Problem:** Fetches ALL market groups with ALL their markets - no pagination!

**Current complexity estimate:** ~2,000-3,000 (will fail!)

**Query:**
```graphql
query Markets {
  marketGroups {        # NO LIMIT - could be 50+
    markets {           # NO LIMIT - could be 100+ per group
      # 25+ fields
    }
  }
}
```

**Solutions:**

Option A - Add pagination to the query:
```graphql
query Markets {
  marketGroups(take: 50) {     # Limit market groups
    markets(take: 20) {        # Limit markets per group
      # fields...
    }
  }
}
```

Option B - Fetch in two steps:
```graphql
# Step 1: Get market groups only
query MarketGroups {
  marketGroups {
    id
    address
    # ... other fields
  }
}

# Step 2: Get markets separately when needed
query MarketsForGroup($groupId: Int!) {
  markets(where: { marketGroupId: { equals: $groupId } }) {
    # fields...
  }
}
```

---

### 2. **OPEN_INTEREST_QUERY in useMarketGroups.ts** (Lines 216-247)

**Problem:** Fetches ALL positions for a market without limit

**Current complexity estimate:** ~300-1,000+ depending on positions

**Query:**
```graphql
positions(where: {...}) {      # NO LIMIT
  market {
    marketGroup {
      # nested fields
    }
  }
  transactions {
    # ...
  }
}
```

**Solution:** Add pagination:
```graphql
positions(
  where: {...}
  take: 100                    # Reasonable limit
) {
  # fields...
}
```

---

### 3. **POSITIONS_QUERY in usePositions.ts** (Lines 6-74)

**Problem:** Fetches ALL positions for an owner/market without limit

**Current complexity estimate:** ~200-800 depending on data

**Query:**
```graphql
positions(where: {...}) {       # NO LIMIT
  market {
    marketGroup {
      markets {                # Another nested list!
        id
      }
    }
  }
  transactions {               # Yet another nested list!
    # fields...
  }
}
```

**Solution:** Add pagination:
```graphql
positions(
  where: {...}
  take: 50                     # Reasonable limit for user positions
  orderBy: { createdAt: desc }
) {
  # fields...
}
```

---

## ✅ Queries That Look OK

These queries have reasonable complexity:

- **useMarket.ts** - `MARKET_QUERY` - Filters to specific market ✓
- **useMarkets.ts** - `MARKETS_BATCH_QUERY` - Uses `where` with specific IDs ✓
- **useLeaderboard.ts** - `GET_ALL_TIME_PROFIT_LEADERBOARD` - Flat list, no nesting ✓
- **useMarketLeaderboard.ts** - `GET_MARKET_LEADERBOARD` - Uses custom resolver ✓

---

## 📊 Recommended Actions

1. **Immediate:** Add `take` limits to these queries:
   - `MARKETS_QUERY`: `marketGroups(take: 100)` and `markets(take: 50)`
   - `OPEN_INTEREST_QUERY`: `positions(take: 1000)`
   - `POSITIONS_QUERY`: `positions(take: 100)`

2. **Consider:** Increase your complexity limit if you need large data sets:
   ```bash
   GRAPHQL_MAX_COMPLEXITY=5000
   ```

3. **Best Practice:** Implement cursor-based pagination for large lists

4. **Monitor:** Watch your server logs for actual complexity values after adding limits

---

## 🧪 Testing

After making changes, test these queries in your GraphQL playground:
- Load the markets page (triggers MARKETS_QUERY)
- Load a user profile (triggers POSITIONS_QUERY)
- Check server logs for complexity values

