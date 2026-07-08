import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

let supabase: any;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.");
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
}

const app = express();

// Request logging (VERY TOP)
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

app.use(express.json({ limit: '10mb' }));

// API Routes
const apiRouter = express.Router();

// PRIORITY LOGIN ROUTE (Directly on app for maximum visibility)
app.post("/api/login", async (req, res) => {
  console.log(`[LOGIN] Attempt for staffId: ${req.body.staffId}`);
  const { staffId, password } = req.body;
  
  if (!staffId || !password) {
    console.log("[LOGIN] Failed: Missing credentials");
    return res.status(400).json({ error: "Staff ID and Password are required" });
  }
  
  try {
    if (!supabase) {
      console.error("[LOGIN] Failed: Supabase not initialized");
      return res.status(500).json({ error: "Database not initialized" });
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
  } catch (err: any) {
    console.error("[LOGIN] Unexpected error:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

// Direct test route on app
app.get("/api-test", (req, res) => {
  console.log("Direct API test hit");
  res.json({ message: "Direct API is working", supabase: !!supabase });
});

// Middleware to check supabase (for other API routes)
app.use((req, res, next) => {
  if (!supabase && req.path.startsWith('/api/') && req.path !== '/api/health' && req.path !== '/api/login') {
    return res.status(500).json({ error: "Supabase is not configured. Please check environment variables." });
  }
  next();
});

// Health check
apiRouter.get("/health", (req, res) => {
    console.log("Health check requested");
    res.json({ 
      status: "ok", 
      supabaseConfigured: !!(supabaseUrl && supabaseKey),
      env: process.env.NODE_ENV,
      ver: "1.0.5"
    });
  });

  apiRouter.get("/debug/routes", (req, res) => {
    try {
      const routes = apiRouter.stack
        .filter((r: any) => r.route)
        .map((r: any) => ({
          path: r.route.path,
          methods: Object.keys(r.route.methods)
        }));
      res.json(routes);
    } catch (e) {
      res.status(500).json({ error: "Failed to list routes" });
    }
  });

  apiRouter.get("/debug/health", async (req, res) => {
    const tables = ["org_settings", "semesters", "sessions", "branches", "staff", "fee_plans", "fee_heads", "students", "transactions"];
    const results: any = {};
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select("id").limit(1);
      results[table] = {
        readable: !error,
        readError: error ? error.message : null
      };
      
      // Try a dummy insert to check RLS (we won't actually commit if we can help it, but here we just check if it's blocked)
      // For simplicity, we just report the read status and the last known error from the user's perspective
    }
    
    res.json(results);
  });

  apiRouter.get("/debug/branches", async (req, res) => {
    try {
      const { data, error } = await supabase.from("branches").select("*");
      res.json({ data, error });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.get("/debug/semesters", async (req, res) => {
    try {
      const { data, error } = await supabase.from("semesters").select("*");
      res.json({ data, error });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.get("/debug/db", async (req, res) => {
    try {
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
    } catch (e: any) {
      res.status(500).json({ error: "Unexpected database error", message: e.message });
    }
  });

  // Settings & Setup
  apiRouter.get("/settings", async (req, res) => {
    try {
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
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  apiRouter.post("/settings/org", async (req, res) => {
    const { name, logo, address, phone } = req.body;
    const { error } = await supabase.from("org_settings").upsert({ id: 1, name, logo, address, phone });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  apiRouter.post("/settings/semester", async (req, res) => {
    const { error } = await supabase.from("semesters").insert({ name: req.body.name });
    if (error) {
      console.error("Semester insert error:", error);
      return res.status(400).json({ error: error.message });
    }
    res.json({ success: true });
  });

  apiRouter.delete("/settings/semester/:id", async (req, res) => {
    const { error } = await supabase.from("semesters").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  apiRouter.post("/settings/session", async (req, res) => {
    const { error } = await supabase.from("sessions").insert({ name: req.body.name });
    if (error) {
      console.error("Session insert error:", error);
      return res.status(400).json({ error: error.message });
    }
    res.json({ success: true });
  });

  apiRouter.delete("/settings/session/:id", async (req, res) => {
    const { error } = await supabase.from("sessions").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  apiRouter.post("/settings/branch", async (req, res) => {
    const { error } = await supabase.from("branches").insert({ name: req.body.name });
    if (error) {
      console.error("Branch insert error:", error);
      return res.status(400).json({ error: error.message });
    }
    res.json({ success: true });
  });

  apiRouter.delete("/settings/branch/:id", async (req, res) => {
    const { error } = await supabase.from("branches").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  apiRouter.post("/settings/staff", async (req, res) => {
    const { staff_id, name, password, role } = req.body;
    const { error } = await supabase.from("staff").insert({ staff_id, name, password, role: role || 'staff' });
    if (error) return res.status(400).json({ error: "Staff ID already exists" });
    res.json({ success: true });
  });

  apiRouter.put("/settings/staff/:id", async (req, res) => {
    const { staff_id, name, password, role } = req.body;
    const { error } = await supabase.from("staff").update({ staff_id, name, password, role }).eq("id", req.params.id);
    if (error) return res.status(400).json({ error: "Staff ID already exists or update failed" });
    res.json({ success: true });
  });

  apiRouter.delete("/settings/staff/:id", async (req, res) => {
    const { data: staff } = await supabase.from("staff").select("role").eq("id", req.params.id).single();
    if (staff?.role === 'admin') {
      return res.status(400).json({ error: "Cannot delete admin" });
    }
    const { error } = await supabase.from("staff").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Fee Plans
  apiRouter.get("/fee-plans", async (req, res) => {
    const { data: plans, error } = await supabase
      .from("fee_plans")
      .select("*, heads:fee_heads(*)");
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(plans);
  });

  apiRouter.post("/fee-plans", async (req, res) => {
    const { name, frequency, heads } = req.body;
    const total = heads.reduce((sum: number, h: any) => sum + Number(h.amount), 0);
    
    const { data: plan, error: planError } = await supabase
      .from("fee_plans")
      .insert({ name, frequency, total_amount: total })
      .select()
      .single();
      
    if (planError) return res.status(500).json({ error: planError.message });
    
    const headsToInsert = heads.map((h: any) => ({
      plan_id: plan.id,
      name: h.name,
      amount: h.amount
    }));
    
    const { error: headsError } = await supabase.from("fee_heads").insert(headsToInsert);
    if (headsError) return res.status(500).json({ error: headsError.message });
    
    res.json({ success: true, id: plan.id });
  });

  apiRouter.delete("/fee-plans/:id", async (req, res) => {
    const { error } = await supabase.from("fee_plans").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  apiRouter.put("/fee-plans/:id", async (req, res) => {
    const { name, frequency, heads } = req.body;
    const total = heads.reduce((sum: number, h: any) => sum + Number(h.amount), 0);
    
    const { error: planError } = await supabase
      .from("fee_plans")
      .update({ name, frequency, total_amount: total })
      .eq("id", req.params.id);
      
    if (planError) return res.status(500).json({ error: planError.message });
    
    // Delete old heads and insert new ones
    await supabase.from("fee_heads").delete().eq("plan_id", req.params.id);
    
    const headsToInsert = heads.map((h: any) => ({
      plan_id: req.params.id,
      name: h.name,
      amount: h.amount
    }));
    
    const { error: headsError } = await supabase.from("fee_heads").insert(headsToInsert);
    if (headsError) return res.status(500).json({ error: headsError.message });
    
    res.json({ success: true });
  });

  // Students
  apiRouter.get("/students", async (req, res) => {
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
    const formatted = students.map((s: any) => ({
      ...s,
      plan_name: s.plan?.name,
      plan_total: s.plan?.total_amount,
      branch_name: s.branch?.name,
      semester_name: s.semester?.name,
      session_name: s.session?.name,
      total_paid: s.transactions?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0
    }));
    
    res.json(formatted);
  });

  apiRouter.post("/students", async (req, res) => {
    const { name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id } = req.body;
    const { error } = await supabase.from("students").insert({
      name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id
    });
    if (error) return res.status(400).json({ error: "Roll No already exists or failed" });
    res.json({ success: true });
  });

  apiRouter.get("/students/:id", async (req, res) => {
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
    
    const formatted = {
      ...student,
      plan_name: student.plan?.name,
      branch_name: student.branch?.name,
      semester_name: student.semester?.name,
      session_name: student.session?.name
    };
    
    res.json(formatted);
  });

  apiRouter.put("/students/:id", async (req, res) => {
    const { name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id } = req.body;
    const { error } = await supabase.from("students").update({
      name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id
    }).eq("id", req.params.id);
    if (error) return res.status(400).json({ error: "Update failed" });
    res.json({ success: true });
  });

  apiRouter.delete("/students/:id", async (req, res) => {
    const { error } = await supabase.from("students").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Transactions
  apiRouter.get("/transactions", async (req, res) => {
    const { data: txs, error } = await supabase
      .from("transactions")
      .select(`
        *,
        student:students(name, roll_no)
      `)
      .order("created_at", { ascending: false });
      
    if (error) return res.status(500).json({ error: error.message });
    
    const formatted = txs.map((t: any) => ({
      ...t,
      student_name: t.student?.name,
      roll_no: t.student?.roll_no
    }));
    
    res.json(formatted);
  });

  apiRouter.post("/transactions", async (req, res) => {
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
  });

  // Reports
  apiRouter.get("/summary", async (req, res) => {
    try {
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
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  apiRouter.get("/ledger", async (req, res) => {
    try {
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
      
      const ledger = students.map((s: any) => ({
        id: s.id,
        name: s.name,
        roll_no: s.roll_no,
        plan_name: s.plan?.name,
        total_due: s.plan?.total_amount || 0,
        total_paid: s.transactions?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0
      }));
      
      res.json(ledger);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ledger" });
    }
  });

// Mount the router
app.use("/api", apiRouter);

// Direct Login Route (Backup) - REMOVED DUPLICATE
// app.post("/api/login", async (req, res) => { ... });

// API Catch-all for 404s
app.all("/api/*", (req, res) => {
  console.log(`[404] API: ${req.method} ${req.path}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

async function startApp() {
  const PORT = 3000;
  console.log("Starting application...");
  
  // Vite/Static Serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Using Vite middleware (Development)");
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
