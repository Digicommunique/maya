import app from "../server";

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("[VERCEL LAMBDA BOOTSTRAP ERROR]:", err);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: "LAMBDA_BOOTSTRAP_ERROR",
        message: "An error occurred while executing the backend application on Vercel.",
        details: err?.message || String(err),
        stack: err?.stack || null
      });
    }
  }
}
