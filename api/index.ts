// Vercel serverless entry point: production-safe Express app (no Vite/Rolldown).
// Lazy-import server so any module-load failure (e.g. native binding) is caught
// and returned as JSON instead of crashing the function (FUNCTION_INVOCATION_FAILED).
let appInstance: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appInstance) {
      const { createApiApp } = await import('../server.ts');
      appInstance = createApiApp();
    }
    return appInstance(req, res);
  } catch (err: any) {
    console.error('[Vercel Function Error]', err?.stack || err?.message || err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: { code: 'FUNCTION_ERROR', message: String(err?.message || err) },
    }));
  }
}
