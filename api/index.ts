export default async function handler(req: any, res: any) {
  try {
    // Dynamically import the Express app to catch any module-level initialization errors
    const serverModule = await import("../server");
    const app = serverModule.default;
    
    // Pass the request and response directly to the Express app
    return app(req, res);
  } catch (err: any) {
    console.error("[VERCEL LAMBDA BOOTSTRAP ERROR]:", err);
    
    // Ensure we send a JSON error response instead of letting the lambda crash with 500 FUNCTION_INVOCATION_FAILED
    if (!res.headersSent) {
      res.status(500).json({
        error: "LAMBDA_BOOTSTRAP_ERROR",
        message: "An error occurred while loading or initializing the backend application on Vercel.",
        details: err?.message || String(err),
        stack: err?.stack || null
      });
    }
  }
}
