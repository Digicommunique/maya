import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Define __filename and __dirname safely for ESM & CJS compatibility
let __filename = "";
let __dirname = "";
try {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
  } else {
    __dirname = process.cwd();
  }
} catch (e) {
  __dirname = process.cwd();
}

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
let supabase: any = null;

if (!supabaseUrl || !supabaseKey) {
  console.error("[CRITICAL CONFIG ERROR] SUPABASE_URL or SUPABASE_KEY is missing from environment variables.");
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized successfully.");
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
}

// Gemini API initialization (Defensive and lazy-initialized)
const geminiApiKey = process.env.GEMINI_API_KEY || "";
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log("Gemini API client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API client:", err);
  }
} else {
  console.log("Gemini API key is not set. Gemini features (if any) will be disabled.");
}

const app = express();

// Request logging middleware (At the very top)
app.use((req, res, next) => {
  console.log(`[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use(express.json({ limit: '10mb' }));

// Combined database configuration checking middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const exemptedPaths = ["/api/health", "/api/debug/routes", "/api-test"];
    if (exemptedPaths.includes(req.path)) {
      return next();
    }
    if (!supabase) {
      console.error(`[DATABASE CONFIG ERROR] Supabase client not initialized for path: ${req.path}`);
      return res.status(500).json({ 
        error: "DATABASE_NOT_INITIALIZED", 
        message: "Database connection could not be established. Please make sure that SUPABASE_URL and SUPABASE_KEY are correctly set in your environment variables." 
      });
    }
  }
  next();
});

// Custom async error wrapper to prevent unhandled promise rejections (Vercel crashers)
const asyncHandler = (fn: (req: any, res: any, next: any) => Promise<any>) => {
  return (req: any, res: any, next: any) => {
    fn(req, res, next).catch((err: any) => {
      console.error(`[ASYNC ROUTE ERROR] ${new Date().toISOString()} in route ${req.method} ${req.path}:`, err);
      if (!res.headersSent) {
        res.status(500).json({
          error: "INTERNAL_SERVER_ERROR",
          message: err.message || "An unexpected server error occurred."
        });
      }
    });
  };
};

// --- DIRECT ROUTE: LOGIN ---
app.post("/api/login", asyncHandler(async (req, res) => {
  console.log(`[LOGIN] Attempt for staffId: ${req.body.staffId}`);
  const { staffId, password } = req.body;
  
  if (!staffId || !password) {
    console.log("[LOGIN] Failed: Missing credentials");
    return res.status(400).json({ error: "Staff ID and Password are required" });
  }
  
  console.log("[LOGIN] Querying Supabase...");
  let { data: staff, error } = await supabase
    .from("staff")
    .select("id, staff_id, name, role")
    .eq("staff_id", staffId)
    .eq("password", password)
    .maybeSingle();
  
  if (error) {
    console.error("[LOGIN] Supabase error:", error);
    return res.status(500).json({ error: "Database connection error", details: error.message });
  }
  
  if (!staff) {
    console.log("[LOGIN] User not found, checking if DB is empty...");
    const { count } = await supabase.from("staff").select("*", { count: 'exact', head: true });
    if (count === 0 && staffId === 'admin' && password === '12345') {
      console.log("[LOGIN] DB empty, creating default admin...");
      const { data: newAdmin } = await supabase
        .from("staff")
        .insert({ staff_id: 'admin', name: 'Administrator', password: '12345', role: 'admin' })
        .select("id, staff_id, name, role")
        .single();
      if (newAdmin) {
        console.log("[LOGIN] Default admin created and logged in");
        return res.json({ success: true, staff: newAdmin });
      }
    }
    console.log("[LOGIN] Invalid credentials");
    return res.status(401).json({ error: "Invalid Staff ID or Password" });
  }
  
  console.log(`[LOGIN] Success for ${staffId} (${staff.role})`);
  res.json({ success: true, staff });
}));

// Direct test route
app.get("/api-test", (req, res) => {
  console.log("Direct API test hit");
  res.json({ message: "Direct API is working", supabase: !!supabase, gemini: !!ai });
});

// API Routes
const apiRouter = express.Router();

// Health check
apiRouter.get("/health", asyncHandler(async (req, res) => {
  console.log("Health check requested");
  res.json({ 
    status: "ok", 
    supabaseConfigured: !!(supabaseUrl && supabaseKey),
    geminiConfigured: !!geminiApiKey,
    env: process.env.NODE_ENV,
    ver: "1.1.0"
  });
}));

// Debug routes
apiRouter.get("/debug/routes", (req, res) => {
  try {
    const routes = apiRouter.stack
      .filter((r: any) => r.route)
      .map((r: any) => ({
        path: r.route.path,
        methods: Object.keys(r.route.methods)
      }));
    res.json(routes);
  } catch (e: any) {
    console.error("Failed to list routes:", e);
    res.status(500).json({ error: "Failed to list routes", message: e.message });
  }
});

apiRouter.get("/debug/health", asyncHandler(async (req, res) => {
  const tables = ["org_settings", "semesters", "sessions", "branches", "staff", "fee_plans", "fee_heads", "students", "transactions"];
  const results: any = {};
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select("id").limit(1);
    results[table] = {
      readable: !error,
      readError: error ? error.message : null
    };
  }
  
  res.json(results);
}));

apiRouter.get("/debug/branches", asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from("branches").select("*");
  res.json({ data, error });
}));

apiRouter.get("/debug/semesters", asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from("semesters").select("*");
  res.json({ data, error });
}));

apiRouter.get("/debug/db", asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from("staff").select("count", { count: 'exact', head: true });
  if (error) {
    return res.status(500).json({ 
      error: "Database connection failed", 
      details: error.message,
      hint: "Make sure the 'staff' table exists in your Supabase project."
    });
  }
  res.json({ 
    status: "connected", 
    staffCount: data 
  });
}));

// Settings & Setup
apiRouter.get("/settings", asyncHandler(async (req, res) => {
  const { data: settings } = await supabase.from("org_settings").select("*").eq("id", 1).maybeSingle();
  const { data: semesters } = await supabase.from("semesters").select("*").order("id");
  const { data: sessions } = await supabase.from("sessions").select("*").order("id");
  const { data: branches } = await supabase.from("branches").select("*").order("id");
  const { data: staff } = await supabase.from("staff").select("id, staff_id, name, password, role").order("id");
  
  res.json({ 
    settings: settings || {}, 
    semesters: semesters || [], 
    sessions: sessions || [], 
    branches: branches || [], 
    staff: staff || [] 
  });
}));

apiRouter.post("/settings/org", asyncHandler(async (req, res) => {
  const { name, logo, address, phone } = req.body;
  const { error } = await supabase.from("org_settings").upsert({ id: 1, name, logo, address, phone });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

apiRouter.post("/settings/semester", asyncHandler(async (req, res) => {
  const { error } = await supabase.from("semesters").insert({ name: req.body.name });
  if (error) {
    console.error("Semester insert error:", error);
    return res.status(400).json({ error: error.message });
  }
  res.json({ success: true });
}));

apiRouter.delete("/settings/semester/:id", asyncHandler(async (req, res) => {
  const { error } = await supabase.from("semesters").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

apiRouter.post("/settings/session", asyncHandler(async (req, res) => {
  const { error } = await supabase.from("sessions").insert({ name: req.body.name });
  if (error) {
    console.error("Session insert error:", error);
    return res.status(400).json({ error: error.message });
  }
  res.json({ success: true });
}));

apiRouter.delete("/settings/session/:id", asyncHandler(async (req, res) => {
  const { error } = await supabase.from("sessions").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

apiRouter.post("/settings/branch", asyncHandler(async (req, res) => {
  const { error } = await supabase.from("branches").insert({ name: req.body.name });
  if (error) {
    console.error("Branch insert error:", error);
    return res.status(400).json({ error: error.message });
  }
  res.json({ success: true });
}));

apiRouter.delete("/settings/branch/:id", asyncHandler(async (req, res) => {
  const { error } = await supabase.from("branches").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

apiRouter.post("/settings/staff", asyncHandler(async (req, res) => {
  const { staff_id, name, password, role } = req.body;
  const { error } = await supabase.from("staff").insert({ staff_id, name, password, role: role || 'staff' });
  if (error) return res.status(400).json({ error: "Staff ID already exists" });
  res.json({ success: true });
}));

apiRouter.put("/settings/staff/:id", asyncHandler(async (req, res) => {
  const { staff_id, name, password, role } = req.body;
  const { error } = await supabase.from("staff").update({ staff_id, name, password, role }).eq("id", req.params.id);
  if (error) return res.status(400).json({ error: "Staff ID already exists or update failed" });
  res.json({ success: true });
}));

apiRouter.delete("/settings/staff/:id", asyncHandler(async (req, res) => {
  const { data: staff } = await supabase.from("staff").select("role").eq("id", req.params.id).single();
  if (staff?.role === 'admin') {
    return res.status(400).json({ error: "Cannot delete admin" });
  }
  const { error } = await supabase.from("staff").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

// Fee Plans
apiRouter.get("/fee-plans", asyncHandler(async (req, res) => {
  const { data: plans, error } = await supabase
    .from("fee_plans")
    .select("*, heads:fee_heads(*)");
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(plans || []);
}));

apiRouter.post("/fee-plans", asyncHandler(async (req, res) => {
  const { name, frequency, heads } = req.body;
  const targetHeads = heads || [];
  const total = targetHeads.reduce((sum: number, h: any) => sum + Number(h.amount), 0);
  
  const { data: plan, error: planError } = await supabase
    .from("fee_plans")
    .insert({ name, frequency, total_amount: total })
    .select()
    .single();
    
  if (planError) return res.status(500).json({ error: planError.message });
  
  const headsToInsert = targetHeads.map((h: any) => ({
    plan_id: plan.id,
    name: h.name,
    amount: h.amount
  }));
  
  if (headsToInsert.length > 0) {
    const { error: headsError } = await supabase.from("fee_heads").insert(headsToInsert);
    if (headsError) return res.status(500).json({ error: headsError.message });
  }
  
  res.json({ success: true, id: plan.id });
}));

apiRouter.delete("/fee-plans/:id", asyncHandler(async (req, res) => {
  const { error } = await supabase.from("fee_plans").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

apiRouter.put("/fee-plans/:id", asyncHandler(async (req, res) => {
  const { name, frequency, heads } = req.body;
  const targetHeads = heads || [];
  const total = targetHeads.reduce((sum: number, h: any) => sum + Number(h.amount), 0);
  
  const { error: planError } = await supabase
    .from("fee_plans")
    .update({ name, frequency, total_amount: total })
    .eq("id", req.params.id);
    
  if (planError) return res.status(500).json({ error: planError.message });
  
  // Delete old heads and insert new ones
  await supabase.from("fee_heads").delete().eq("plan_id", req.params.id);
  
  const headsToInsert = targetHeads.map((h: any) => ({
    plan_id: req.params.id,
    name: h.name,
    amount: h.amount
  }));
  
  if (headsToInsert.length > 0) {
    const { error: headsError } = await supabase.from("fee_heads").insert(headsToInsert);
    if (headsError) return res.status(500).json({ error: headsError.message });
  }
  
  res.json({ success: true });
}));

// Students
apiRouter.get("/students", asyncHandler(async (req, res) => {
  const { data: students, error } = await supabase
    .from("students")
    .select(`
      *,
      plan:fee_plans(name, total_amount),
      branch:branches(name),
      semester:semesters(name),
      session:sessions(name),
      transactions(amount)
    `);
    
  if (error) return res.status(500).json({ error: error.message });
  
  // Format data to match previous structure
  const formatted = (students || []).map((s: any) => ({
    ...s,
    plan_name: s.plan?.name,
    plan_total: s.plan?.total_amount,
    branch_name: s.branch?.name,
    semester_name: s.semester?.name,
    session_name: s.session?.name,
    total_paid: s.transactions?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0
  }));
  
  res.json(formatted);
}));

apiRouter.post("/students", asyncHandler(async (req, res) => {
  const { name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id } = req.body;
  const { error } = await supabase.from("students").insert({
    name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id
  });
  if (error) return res.status(400).json({ error: "Roll No already exists or failed" });
  res.json({ success: true });
}));

apiRouter.get("/students/:id", asyncHandler(async (req, res) => {
  const { data: student, error } = await supabase
    .from("students")
    .select(`
      *,
      plan:fee_plans(name),
      branch:branches(name),
      semester:semesters(name),
      session:sessions(name)
    `)
    .eq("id", req.params.id)
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  if (!student) return res.status(404).json({ error: "Student not found" });
  
  const formatted = {
    ...student,
    plan_name: student.plan?.name,
    branch_name: student.branch?.name,
    semester_name: student.semester?.name,
    session_name: student.session?.name
  };
  
  res.json(formatted);
}));

apiRouter.put("/students/:id", asyncHandler(async (req, res) => {
  const { name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id } = req.body;
  const { error } = await supabase.from("students").update({
    name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id
  }).eq("id", req.params.id);
  if (error) return res.status(400).json({ error: "Update failed" });
  res.json({ success: true });
}));

apiRouter.delete("/students/:id", asyncHandler(async (req, res) => {
  const { error } = await supabase.from("students").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

// Transactions
apiRouter.get("/transactions", asyncHandler(async (req, res) => {
  const { data: txs, error } = await supabase
    .from("transactions")
    .select(`
      *,
      student:students(name, roll_no)
    `)
    .order("created_at", { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = (txs || []).map((t: any) => ({
    ...t,
    student_name: t.student?.name,
    roll_no: t.student?.roll_no
  }));
  
  res.json(formatted);
}));

apiRouter.post("/transactions", asyncHandler(async (req, res) => {
  const { student_id, amount, payment_mode, transaction_id, academic_term, transaction_date, bank_account } = req.body;
  
  if (transaction_id) {
    const { data: existing } = await supabase.from("transactions").select("id").eq("transaction_id", transaction_id).maybeSingle();
    if (existing) {
      return res.status(400).json({ error: "DUPLICATE_TXID", message: "This Transaction ID has already been used for a previous student." });
    }
  }

  const { error } = await supabase.from("transactions").insert({
    student_id, amount, payment_mode, transaction_id, academic_term, transaction_date, bank_account
  });
  
  if (error) return res.status(500).json({ error: "SERVER_ERROR", message: error.message });
  res.json({ success: true });
}));

// Reports
apiRouter.get("/summary", asyncHandler(async (req, res) => {
  const { data: txs } = await supabase.from("transactions").select("amount");
  const { count: studentCount } = await supabase.from("students").select("*", { count: 'exact', head: true });
  const { count: planCount } = await supabase.from("fee_plans").select("*", { count: 'exact', head: true });
  
  const totalCollections = txs?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select(`
      *,
      student:students(name)
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  const formattedRecent = recentTransactions?.map((t: any) => ({
    ...t,
    student_name: t.student?.name
  })) || [];

  res.json({
    totalCollections,
    studentCount: studentCount || 0,
    planCount: planCount || 0,
    recentTransactions: formattedRecent
  });
}));

apiRouter.get("/ledger", asyncHandler(async (req, res) => {
  const { data: students, error } = await supabase
    .from("students")
    .select(`
      id,
      name,
      roll_no,
      plan:fee_plans(name, total_amount),
      transactions(amount)
    `);
    
  if (error) throw error;
  
  const ledger = (students || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    roll_no: s.roll_no,
    plan_name: s.plan?.name,
    total_due: s.plan?.total_amount || 0,
    total_paid: s.transactions?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0
  }));
  
  res.json(ledger);
}));

// Mount the router
app.use("/api", apiRouter);

// API Catch-all for 404s
app.all("/api/*", (req, res) => {
  console.log(`[404] API: ${req.method} ${req.path}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

async function startApp() {
  if (process.env.VERCEL) {
    console.log("Running in Vercel Serverless environment. Express router initialized.");
    return;
  }

  const PORT = 3000;
  console.log("Starting application...");
  
  // Vite/Static Serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Using Vite middleware (Development)");
    
    // Dynamically require to avoid static tracing by Vercel NFT bundlers
    const vitePkg = "vite";
    const { createServer: createViteServer } = await import(vitePkg);
    
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static files from dist (Production)");
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Initialize server logic
startApp().catch(err => {
  console.error("Failed to start app:", err);
});

export default app;
