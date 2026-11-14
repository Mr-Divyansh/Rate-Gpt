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
        summary: "API health and live-source configuration",
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
        summary: "On-demand government mandi prices",
        parameters: [
          { name: "state", in: "query" },
          { name: "district", in: "query" },
          { name: "market", in: "query" },
          { name: "commodity", in: "query" },
          { name: "date", in: "query" },
          { name: "search", in: "query" },
          { name: "limit", in: "query" },
          { name: "offset", in: "query" },
          { name: "sort", in: "query" },
        ],
        responses: {
          "200": { description: "Live government records and upstream pagination metadata" },
          "502": { description: "Government API error" },
          "503": { description: "Government API is not configured or rate limited" },
          "504": { description: "Government API timeout" },
        },
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
    "/sync-status": {
      get: {
        summary: "Live request mode and bulk-sync status",
        responses: { "200": { description: "OK" } },
      },
    },
  },
};
