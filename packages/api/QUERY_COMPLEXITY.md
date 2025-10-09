# GraphQL Query Complexity

This project now includes query complexity analysis to protect the GraphQL API from resource exhaustion and DoS attacks.

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

- Each field in a query has a complexity score (default: 1)
- Complexity is calculated recursively for all nested fields
- The total complexity is the sum of all field complexities

**Example:**

```graphql
query {
  markets {           # complexity: 1
    id               # complexity: 1
    name             # complexity: 1
    positions {      # complexity: 1
      id            # complexity: 1
      amount        # complexity: 1
    }
  }
}
# Total complexity: 6
```

## Custom Field Complexity

You can set custom complexity values for specific fields using the `@Extensions` decorator in TypeGraphQL:

```typescript
@ObjectType()
class Market {
  @Field()
  @Extensions({ complexity: 10 })
  expensiveCalculation: number;
}
```

Or using field extensions in the schema:

```typescript
{
  type: GraphQLObjectType,
  fields: {
    expensiveField: {
      type: GraphQLString,
      extensions: {
        complexity: 20
      }
    }
  }
}
```

## Error Response

When a query exceeds the maximum complexity, the API returns:

```json
{
  "errors": [
    {
      "message": "Query is too complex: 1500. Maximum allowed complexity: 1000",
      "extensions": {
        "code": "COMPLEXITY_LIMIT_EXCEEDED",
        "complexity": 1500,
        "maxComplexity": 1000
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

This feature is powered by [`graphql-query-complexity`](https://www.npmjs.com/package/graphql-query-complexity).

For more advanced configuration options, see the package documentation.

