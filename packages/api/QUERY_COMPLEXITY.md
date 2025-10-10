# GraphQL Query Complexity

This project now includes query complexity analysis to protect the GraphQL API from resource exhaustion and DoS attacks using [`graphql-validation-complexity`](https://www.npmjs.com/package/graphql-validation-complexity).

## Overview

Query complexity is calculated for every incoming GraphQL query. If a query exceeds the maximum allowed complexity, it will be rejected with an error.

## Configuration

### Maximum Complexity

The maximum allowed query complexity can be configured via environment variable:

```bash
GRAPHQL_MAX_COMPLEXITY=1000  # Default value
```

If not set, the default maximum complexity is **1000**.

### How Complexity is Calculated

The complexity calculation uses the following rules:

- **Scalar fields**: Cost of 1 per field
- **Object fields**: Cost of 0 (we count the scalar fields inside)
- **List fields**: Cost is multiplied by 10 (configurable via `listFactor`)

**Example:**

```graphql
query {
  markets {           # list: base cost × 10
    id               # scalar: 1
    name             # scalar: 1
    positions {      # list: base cost × 10
      id            # scalar: 1
      amount        # scalar: 1
    }
  }
}
# Calculation: ((1 + 1 + (1 + 1) × 10) × 10) = 130
```

## Adjusting Complexity Factors

You can customize the complexity calculation in `/packages/api/src/graphql/startApolloServer.ts`:

```typescript
createComplexityLimitRule(maxComplexity, {
  scalarCost: 1,        // Cost per scalar field (default: 1)
  objectCost: 0,        // Cost per object field (default: 0)
  listFactor: 10,       // Multiply cost by this for lists (default: 10)
  onCost: (cost: number) => {
    console.log(`Query complexity: ${cost}`);
  },
})
```

**Tips:**
- Increase `listFactor` if you want to penalize nested list queries more heavily
- Adjust `scalarCost` to change the base cost of all fields
- Set `objectCost` > 0 if you want to add cost for object traversal itself

## Error Response

When a query exceeds the maximum complexity, the API returns a GraphQL validation error:

```json
{
  "errors": [
    {
      "message": "The query exceeds the maximum cost of 1000. Actual cost is 1500",
      "locations": [...],
      "extensions": {
        "code": "GRAPHQL_VALIDATION_FAILED"
      }
    }
  ]
}
```

## Monitoring

Query complexity is logged for every request:

```
Query complexity: 47
```

You can monitor these logs to:
- Identify problematic queries
- Adjust the maximum complexity threshold
- Optimize your schema design

## Tips

1. **Start with a reasonable limit**: The default of 1000 is a good starting point
2. **Monitor your logs**: Watch for queries that are rejected and adjust as needed
3. **Use custom complexity**: For expensive operations (database joins, external API calls), set higher complexity values
4. **Test your queries**: During development, check the complexity of common queries

## Related

This feature is powered by [`graphql-validation-complexity`](https://www.npmjs.com/package/graphql-validation-complexity).

For more advanced configuration options, see the [package documentation](https://github.com/4Catalyzer/graphql-validation-complexity).

