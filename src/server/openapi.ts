export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Rate-GPT Mandi Price API",
    version: "1.0.0",
    description:
      "Backend API for Indian agricultural mandi prices (AGMARKNET/OGD).",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": {
      get: {
        summary: "Health and database stats",
        responses: { "200": { description: "OK" } },
      },
    },
    "/meta/filters": {
      get: {
        summary: "Cascading filter metadata",
        parameters: [
          { name: "state", in: "query" },
          { name: "district", in: "query" },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/prices": {
      get: {
        summary: "Latest mandi prices",
        parameters: [
          { name: "state", in: "query" },
          { name: "district", in: "query" },
          { name: "market", in: "query" },
          { name: "commodity", in: "query" },
          { name: "search", in: "query" },
          { name: "limit", in: "query" },
          { name: "offset", in: "query" },
          { name: "sort", in: "query" },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/prices/trend": {
      get: {
        summary: "Historical price trend",
        parameters: [
          { name: "commodity", in: "query", required: true },
          { name: "market", in: "query", required: true },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/prices/compare": {
      get: {
        summary: "Cross-market comparison",
        parameters: [{ name: "commodity", in: "query", required: true }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/commodities/search": {
      get: {
        summary: "Commodity autocomplete",
        parameters: [
          { name: "q", in: "query", required: true },
          { name: "limit", in: "query" },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/admin/sync": {
      post: {
        summary: "Trigger data sync (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/admin/logs": {
      get: {
        summary: "Recent sync logs (admin)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/sync-status": {
      get: {
        summary: "Last successful sync and next scheduled execution",
        responses: { "200": { description: "OK" } },
      },
    },
    "/scheduler/sync": {
      get: {
        summary: "Daily scheduled synchronization (Vercel Cron)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Synchronization completed" },
          "401": { description: "Unauthorized" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
  },
};
