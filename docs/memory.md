# Rate GPT — Architecture Decisions Log

## Product
- Application Name: Rate GPT
- Purpose: Discover, filter, compare, and track agricultural mandi commodity prices in India.
- Data Source: Government of India Open Government Data (OGD) / AGMARKNET.
- Resource ID: `9ef84268-d588-465a-a308-a864a43d0070`.

## Architecture & Technology Decisions
1. **Full-stack Monorepo on Express + Vite**: Vite middlewares mounted inside `server.ts` during development for sub-second hot reloading, compiling to standalone static files in production.
2. **Database Engine**: Embedded `better-sqlite3` database engine initializing tables matching the Prisma schema (`prisma/schema.prisma`). Allows zero-dependency local runs and immediate tests, while Prisma schema provides an instant path to PostgreSQL when deployed.
3. **Data Integrity**: Stable composite key `state|district|market|commodity|variety|arrival_date` prevents duplicate imports while allowing safe price updates.
4. **Theme Design**: Strict black-and-white dual theme without decorative gradients, adhering to accessibility standards.
