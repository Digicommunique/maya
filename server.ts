import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

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

// Robust in-memory local fallback database helper
let mockDbStore: any = null;

function getMockDbStore() {
  if (!mockDbStore) {
    mockDbStore = {
      org_settings: [
        { id: 1, name: "Maya Academy", logo: "", address: "123 Education Lane", phone: "+1 555-0199" }
      ],
      semesters: [
        { id: 1, name: "Semester 1" },
        { id: 2, name: "Semester 2" }
      ],
      sessions: [
        { id: 1, name: "2025-2026" },
        { id: 2, name: "2026-2027" }
      ],
      branches: [
        { id: 1, name: "Computer Science" },
        { id: 2, name: "Electrical Engineering" }
      ],
      staff: [
        { id: 1, staff_id: "admin", name: "Administrator", password: "12345", role: "admin" },
        { id: 2, staff_id: "ghazi", name: "Ghazi Accountant", password: "mayaghazi@123", role: "accountant" },
        { id: 3, staff_id: "accountant", name: "John Accountant", password: "123", role: "accountant" }
      ],
      fee_plans: [
        { id: 1, name: "Tuition & Lab Fee Plan", frequency: "Semester", total_amount: 1500 }
      ],
      fee_heads: [
        { id: 1, plan_id: 1, name: "Tuition Fee", amount: 1200 },
        { id: 2, plan_id: 1, name: "Lab Fee", amount: 300 }
      ],
      students: [
        { id: 1, name: "Alice Johnson", guardian_name: "Robert Johnson", roll_no: "CS-2025-001", phone: "555-0101", plan_id: 1, branch_id: 1, semester_id: 1, session_id: 1, created_at: new Date().toISOString() },
        { id: 2, name: "Bob Smith", guardian_name: "William Smith", roll_no: "EE-2025-042", phone: "555-0102", plan_id: 1, branch_id: 2, semester_id: 1, session_id: 1, created_at: new Date().toISOString() }
      ],
      transactions: [
        { id: 1, student_id: 1, amount: 500, payment_mode: "Cash", transaction_id: "TXN10001", academic_term: "Semester 1", transaction_date: "2026-07-01", bank_account: "", created_at: "2026-07-01T10:00:00.000Z" }
      ]
    };
  }
  return mockDbStore;
}

class MockSupabaseQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderField: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;
  private selectFields: string | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string, options?: any) {
    if (this.operation === 'select') {
      this.selectFields = fields || '*';
    }
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push((item) => {
      return item[field] === value || String(item[field]) === String(value);
    });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(data: any) {
    this.operation = 'insert';
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.operation = 'update';
    this.payload = data;
    return this;
  }

  upsert(data: any) {
    this.operation = 'upsert';
    this.payload = data;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute();
      if (onfulfilled) {
        return onfulfilled(result);
      }
      return result;
    } catch (err) {
      if (onrejected) {
        return onrejected(err);
      }
      throw err;
    }
  }

  private async execute() {
    const store = getMockDbStore();
    let dataList = store[this.table] || [];

    let count: number | null = null;

    if (this.operation === 'select') {
      let filtered = [...dataList];
      for (const filter of this.filters) {
        filtered = filtered.filter(filter);
      }

      let resolved = filtered.map(item => {
        const copy = { ...item };
        if (this.table === 'fee_plans') {
          copy.heads = store['fee_heads'].filter((h: any) => h.plan_id === item.id || String(h.plan_id) === String(item.id));
        }
        if (this.table === 'students') {
          copy.plan = store['fee_plans'].find((p: any) => p.id === item.plan_id || String(p.id) === String(item.plan_id)) || null;
          copy.branch = store['branches'].find((b: any) => b.id === item.branch_id || String(b.id) === String(item.branch_id)) || null;
          copy.semester = store['semesters'].find((s: any) => s.id === item.semester_id || String(s.id) === String(item.semester_id)) || null;
          copy.session = store['sessions'].find((s: any) => s.id === item.session_id || String(s.id) === String(item.session_id)) || null;
          copy.transactions = store['transactions'].filter((t: any) => t.student_id === item.id || String(t.student_id) === String(item.id));
        }
        if (this.table === 'transactions') {
          copy.student = store['students'].find((s: any) => s.id === item.student_id || String(s.id) === String(item.student_id)) || null;
        }
        return copy;
      });

      if (this.orderField) {
        const field = this.orderField;
        const asc = this.orderAscending;
        resolved.sort((a, b) => {
          const valA = a[field];
          const valB = b[field];
          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          const cmp = valA < valB ? -1 : 1;
          return asc ? cmp : -cmp;
        });
      }

      if (this.limitCount !== null) {
        resolved = resolved.slice(0, this.limitCount);
      }

      count = resolved.length;

      if (this.isSingle) {
        return { data: resolved[0] || null, error: resolved[0] ? null : new Error("Record not found"), count };
      }
      if (this.isMaybeSingle) {
        return { data: resolved[0] || null, error: null, count };
      }

      return { data: resolved, error: null, count };
    }

    if (this.operation === 'insert') {
      const itemsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted: any[] = [];
      for (const item of itemsToInsert) {
        const newItem = {
          id: item.id || (dataList.length > 0 ? Math.max(...dataList.map((d: any) => Number(d.id) || 0)) + 1 : 1),
          created_at: new Date().toISOString(),
          ...item
        };
        dataList.push(newItem);
        inserted.push(newItem);
      }
      store[this.table] = dataList;

      if (this.isSingle) {
        return { data: inserted[0] || null, error: null };
      }
      return { data: Array.isArray(this.payload) ? inserted : inserted[0], error: null };
    }

    if (this.operation === 'update') {
      let matching = [...dataList];
      for (const filter of this.filters) {
        matching = matching.filter(filter);
      }

      const matchingIds = new Set(matching.map((m: any) => m.id));
      dataList = dataList.map((item: any) => {
        if (matchingIds.has(item.id)) {
          return { ...item, ...this.payload };
        }
        return item;
      });
      store[this.table] = dataList;

      const updated = dataList.filter((item: any) => matchingIds.has(item.id));
      if (this.isSingle) {
        return { data: updated[0] || null, error: null };
      }
      return { data: updated, error: null };
    }

    if (this.operation === 'upsert') {
      const isArray = Array.isArray(this.payload);
      const itemsToUpsert = isArray ? this.payload : [this.payload];
      const upserted: any[] = [];

      for (const item of itemsToUpsert) {
        let index = -1;
        if (this.table === 'org_settings') {
          index = dataList.findIndex((d: any) => d.id === 1 || String(d.id) === "1");
        } else if (item.id) {
          index = dataList.findIndex((d: any) => d.id === item.id || String(d.id) === String(item.id));
        }

        if (index > -1) {
          dataList[index] = { ...dataList[index], ...item };
          upserted.push(dataList[index]);
        } else {
          const newItem = {
            id: item.id || (dataList.length > 0 ? Math.max(...dataList.map((d: any) => Number(d.id) || 0)) + 1 : 1),
            created_at: new Date().toISOString(),
            ...item
          };
          dataList.push(newItem);
          upserted.push(newItem);
        }
      }
      store[this.table] = dataList;

      return { data: isArray ? upserted : upserted[0], error: null };
    }

    if (this.operation === 'delete') {
      let toDelete = [...dataList];
      for (const filter of this.filters) {
        toDelete = toDelete.filter(filter);
      }

      const toDeleteIds = new Set(toDelete.map((m: any) => m.id));
      dataList = dataList.filter((item: any) => !toDeleteIds.has(item.id));
      store[this.table] = dataList;

      return { data: null, error: null };
    }

    return { data: null, error: new Error("Unsupported operation") };
  }
}

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
let supabase: any = null;
let isMockDatabase = false;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("MY_SUPABASE_URL") || supabaseKey.includes("MY_SUPABASE_KEY")) {
  console.warn("[DATABASE CONFIG] Supabase credentials missing or placeholder. Initializing robust in-memory local database fallback.");
  isMockDatabase = true;
  supabase = {
    from: (table: string) => new MockSupabaseQueryBuilder(table)
  };
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized successfully with URL:", supabaseUrl);
  } catch (e) {
    console.error("Failed to initialize Supabase client, falling back to in-memory database:", e);
    isMockDatabase = true;
    supabase = {
      from: (table: string) => new MockSupabaseQueryBuilder(table)
    };
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
    if (isMockDatabase) {
      console.log(`[DATABASE CONFIG INFO] Serving ${req.path} via robust in-memory local fallback database.`);
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

  const cleanStaffId = String(staffId).trim();
  const cleanPassword = String(password).trim();

  // Special master handling for Admin account (accepts 12345 or MayaDCfee@12345)
  if (cleanStaffId.toLowerCase() === 'admin') {
    if (cleanPassword === '12345' || cleanPassword === 'MayaDCfee@12345') {
      let adminStaff: any = null;
      try {
        const { data } = await supabase
          .from("staff")
          .select("id, staff_id, name, role, password")
          .ilike("staff_id", "admin")
          .maybeSingle();
        adminStaff = data;
      } catch (e) {
        console.warn("[LOGIN] Error fetching admin from DB:", e);
      }

      if (adminStaff) {
        if (adminStaff.password !== cleanPassword) {
          try {
            await supabase.from("staff").update({ password: cleanPassword }).eq("id", adminStaff.id);
          } catch (e) {
            console.warn("[LOGIN] Admin password update failed:", e);
          }
        }
        console.log("[LOGIN] Admin authenticated with master password");
        return res.json({
          success: true,
          staff: {
            id: adminStaff.id,
            staff_id: adminStaff.staff_id || 'admin',
            name: adminStaff.name || 'Administrator',
            role: adminStaff.role || 'admin'
          }
        });
      } else {
        // Try creating the admin record in DB
        let newAdmin: any = null;
        try {
          const { data } = await supabase
            .from("staff")
            .insert({ staff_id: 'admin', name: 'Administrator', password: cleanPassword, role: 'admin' })
            .select("id, staff_id, name, role")
            .single();
          newAdmin = data;
        } catch (e) {
          console.warn("[LOGIN] Admin insertion in DB failed, using fallback:", e);
        }

        console.log("[LOGIN] Default admin authenticated");
        return res.json({
          success: true,
          staff: newAdmin || { id: 1, staff_id: 'admin', name: 'Administrator', role: 'admin' }
        });
      }
    }
  }

  // Special master handling for Ghazi accountant account (accepts mayaghazi@123)
  if (cleanStaffId.toLowerCase() === 'ghazi') {
    if (cleanPassword === 'mayaghazi@123') {
      let ghaziStaff: any = null;
      try {
        const { data } = await supabase
          .from("staff")
          .select("id, staff_id, name, role, password")
          .ilike("staff_id", "ghazi")
          .maybeSingle();
        ghaziStaff = data;
      } catch (e) {
        console.warn("[LOGIN] Error fetching ghazi from DB:", e);
      }

      if (ghaziStaff) {
        if (ghaziStaff.password !== 'mayaghazi@123' || ghaziStaff.role !== 'accountant') {
          try {
            await supabase.from("staff").update({ password: 'mayaghazi@123', role: 'accountant' }).eq("id", ghaziStaff.id);
          } catch (e) {
            console.warn("[LOGIN] Ghazi account update failed:", e);
          }
        }
        console.log("[LOGIN] Ghazi authenticated with master password");
        return res.json({
          success: true,
          staff: {
            id: ghaziStaff.id,
            staff_id: ghaziStaff.staff_id || 'ghazi',
            name: ghaziStaff.name || 'Ghazi Accountant',
            role: 'accountant'
          }
        });
      } else {
        // Create ghazi account in DB
        let newGhazi: any = null;
        try {
          const { data } = await supabase
            .from("staff")
            .insert({ staff_id: 'ghazi', name: 'Ghazi Accountant', password: 'mayaghazi@123', role: 'accountant' })
            .select("id, staff_id, name, role")
            .single();
          newGhazi = data;
        } catch (e) {
          console.warn("[LOGIN] Ghazi insertion in DB failed, using fallback:", e);
        }

        console.log("[LOGIN] Ghazi account authenticated and created");
        return res.json({
          success: true,
          staff: newGhazi || { id: 2, staff_id: 'ghazi', name: 'Ghazi Accountant', role: 'accountant' }
        });
      }
    }
  }

  // Standard lookup for all staff / admin with custom set password
  console.log("[LOGIN] Querying staff from DB...");
  try {
    let { data: staff, error } = await supabase
      .from("staff")
      .select("id, staff_id, name, role, password")
      .ilike("staff_id", cleanStaffId)
      .maybeSingle();

    if (error) {
      console.error("[LOGIN] Supabase query error:", error);
    }

    if (staff && (staff.password === cleanPassword || (cleanStaffId.toLowerCase() === 'admin' && (cleanPassword === '12345' || cleanPassword === 'MayaDCfee@12345')))) {
      console.log(`[LOGIN] Success for ${cleanStaffId} (${staff.role})`);
      return res.json({
        success: true,
        staff: {
          id: staff.id,
          staff_id: staff.staff_id,
          name: staff.name,
          role: staff.role
        }
      });
    }
  } catch (err) {
    console.error("[LOGIN] Exception during login query:", err);
  }

  console.log("[LOGIN] User not found or invalid credentials");
  return res.status(401).json({ error: "Invalid Staff ID or Password" });
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
  const [{ data: students, error }, { data: txs }] = await Promise.all([
    supabase
      .from("students")
      .select(`
        *,
        plan:fee_plans(name, total_amount),
        branch:branches(name),
        semester:semesters(name),
        session:sessions(name)
      `)
      .order("id", { ascending: false }),
    supabase.from("transactions").select("student_id, amount")
  ]);
    
  if (error) return res.status(500).json({ error: error.message });

  const studentPaidMap = new Map<number, number>();
  (txs || []).forEach((t: any) => {
    if (t.student_id) {
      const current = studentPaidMap.get(Number(t.student_id)) || 0;
      studentPaidMap.set(Number(t.student_id), current + Number(t.amount || 0));
    }
  });
  
  // Format data to match previous structure
  const formatted = (students || []).map((s: any) => ({
    ...s,
    plan_name: s.plan?.name,
    plan_total: s.plan?.total_amount,
    branch_name: s.branch?.name,
    semester_name: s.semester?.name,
    session_name: s.session?.name,
    total_paid: studentPaidMap.get(Number(s.id)) || 0
  }));
  
  res.json(formatted);
}));

apiRouter.post("/students", asyncHandler(async (req, res) => {
  const { name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id, merge_duplicate, created_at } = req.body;
  
  if (roll_no) {
    const { data: existing } = await supabase.from("students").select("id, name").eq("roll_no", roll_no).maybeSingle();
    if (existing) {
      if (merge_duplicate) {
        const { error: updErr } = await supabase.from("students").update({
          name, guardian_name, phone, plan_id, branch_id, semester_id, session_id
        }).eq("id", existing.id);
        if (updErr) return res.status(500).json({ error: "Merge failed", message: updErr.message });
        return res.json({ success: true, merged: true, id: existing.id });
      } else {
        return res.status(400).json({ 
          error: "DUPLICATE_ROLLNO", 
          message: `Student with Roll No '${roll_no}' already exists (${existing.name}).`,
          student: existing
        });
      }
    }
  }

  const insertPayload: any = {
    name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id
  };
  if (created_at) {
    insertPayload.created_at = created_at;
  }

  const { data, error } = await supabase.from("students").insert(insertPayload).select().single();

  if (error) return res.status(400).json({ error: "Roll No already exists or failed", details: error.message });
  res.json({ success: true, id: data?.id });
}));

// High-speed Bulk Students Endpoint
apiRouter.post("/students/bulk", asyncHandler(async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "INVALID_PAYLOAD", message: "Students array is required and cannot be empty." });
  }

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];
  const insertedIds: any[] = [];

  // Extract all roll_nos to check existing in bulk
  const rollNos = students.map((s: any) => s.roll_no ? String(s.roll_no).trim() : '').filter(Boolean);
  const existingMap = new Map<string, any>();

  if (rollNos.length > 0) {
    const { data: existingRecords } = await supabase
      .from("students")
      .select("id, roll_no, name")
      .in("roll_no", rollNos);
    
    (existingRecords || []).forEach((rec: any) => {
      if (rec.roll_no) existingMap.set(String(rec.roll_no).trim().toLowerCase(), rec);
    });
  }

  const toInsert: any[] = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const rollNo = s.roll_no ? String(s.roll_no).trim() : '';
    const cleanRollNoLower = rollNo.toLowerCase();

    if (rollNo && existingMap.has(cleanRollNoLower)) {
      const existing = existingMap.get(cleanRollNoLower);
      if (s.merge_duplicate) {
        const { error: updErr } = await supabase.from("students").update({
          name: s.name,
          guardian_name: s.guardian_name,
          phone: s.phone,
          plan_id: s.plan_id ? Number(s.plan_id) : null,
          branch_id: s.branch_id ? Number(s.branch_id) : null,
          semester_id: s.semester_id ? Number(s.semester_id) : null,
          session_id: s.session_id ? Number(s.session_id) : null
        }).eq("id", existing.id);

        if (updErr) {
          failCount++;
          errors.push(`${s.name} (Roll: ${rollNo}): ${updErr.message}`);
        } else {
          successCount++;
          insertedIds.push(existing.id);
        }
      } else {
        failCount++;
        errors.push(`${s.name} (Roll: ${rollNo}): Roll Number already assigned to ${existing.name}`);
      }
    } else {
      toInsert.push({
        name: s.name,
        guardian_name: s.guardian_name,
        roll_no: rollNo || `[Auto] R-${Math.floor(100000 + Math.random() * 900000)}`,
        phone: s.phone,
        plan_id: s.plan_id ? Number(s.plan_id) : null,
        branch_id: s.branch_id ? Number(s.branch_id) : null,
        semester_id: s.semester_id ? Number(s.semester_id) : null,
        session_id: s.session_id ? Number(s.session_id) : null,
        created_at: s.created_at || new Date().toISOString()
      });
    }
  }

  if (toInsert.length > 0) {
    const { data: insertedData, error: batchErr } = await supabase.from("students").insert(toInsert).select("id");
    if (batchErr) {
      console.warn("[BULK INSERT FALLBACK] Batch insert encountered error, falling back to individual inserts:", batchErr.message);
      for (const item of toInsert) {
        const { data: singleData, error: singleErr } = await supabase.from("students").insert(item).select("id").single();
        if (singleErr) {
          failCount++;
          errors.push(`${item.name} (Roll: ${item.roll_no}): ${singleErr.message}`);
        } else {
          successCount++;
          if (singleData?.id) insertedIds.push(singleData.id);
        }
      }
    } else {
      successCount += toInsert.length;
      (insertedData || []).forEach((item: any) => {
        if (item.id) insertedIds.push(item.id);
      });
    }
  }

  res.json({ success: true, total: students.length, successCount, failCount, errors, insertedIds });
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
  const { name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id, edited_by = "Accountant" } = req.body;
  
  // Retrieve existing student data before update for audit history
  const { data: existing } = await supabase
    .from("students")
    .select(`
      *,
      plan:fee_plans(name),
      branch:branches(name),
      semester:semesters(name),
      session:sessions(name)
    `)
    .eq("id", req.params.id)
    .maybeSingle();

  const prevData = req.body.previous_data || (existing ? {
    name: existing.name,
    guardian_name: existing.guardian_name,
    roll_no: existing.roll_no,
    phone: existing.phone,
    plan_id: existing.plan_id,
    branch_id: existing.branch_id,
    semester_id: existing.semester_id,
    session_id: existing.session_id,
    plan_name: existing.plan?.name || existing.plan_name,
    branch_name: existing.branch?.name || existing.branch_name,
    semester_name: existing.semester?.name || existing.semester_name,
    session_name: existing.session?.name || existing.session_name
  } : null);

  const updatePayload: any = {
    name, guardian_name, roll_no, phone, plan_id, branch_id, semester_id, session_id,
    is_edited: true,
    edited_by,
    edited_at: new Date().toISOString(),
  };

  if (prevData) {
    updatePayload.previous_data = prevData;
  }

  const { error } = await supabase.from("students").update(updatePayload).eq("id", req.params.id);
  if (error) return res.status(400).json({ error: "Update failed", message: error.message });
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
    student_name: t.student?.name || t.student_name,
    roll_no: t.student?.roll_no || t.roll_no
  }));
  
  res.json(formatted);
}));

apiRouter.post("/transactions", asyncHandler(async (req, res) => {
  const { student_id, amount, payment_mode, transaction_id, academic_term, transaction_date, bank_account, merge_duplicate } = req.body;
  
  let finalTxId = transaction_id ? String(transaction_id).trim() : '';

  if (finalTxId) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("id, student_id, student:students(name, roll_no)")
      .eq("transaction_id", finalTxId)
      .maybeSingle();

    if (existing) {
      if (merge_duplicate) {
        const updObj: any = { student_id, amount, payment_mode, academic_term, transaction_date, bank_account };
        let { error: updErr } = await supabase.from("transactions").update(updObj).eq("id", existing.id);
        if (updErr && (updErr.message?.includes("bank_account") || updErr.message?.includes("schema cache"))) {
          delete updObj.bank_account;
          const retryUpd = await supabase.from("transactions").update(updObj).eq("id", existing.id);
          updErr = retryUpd.error;
        }
        if (updErr) return res.status(500).json({ error: "Merge failed", message: updErr.message });
        return res.json({ success: true, merged: true, id: existing.id, transaction_id: finalTxId });
      } else {
        const studentInfo = (existing as any)?.student;
        const studentName = studentInfo?.name ? studentInfo.name : 'another student';
        const rollNo = studentInfo?.roll_no ? ` (Roll No: ${studentInfo.roll_no})` : '';
        return res.status(400).json({
          error: "DUPLICATE_TRANSACTION_ID",
          message: `Duplicate Transaction ID! Transaction ID '${finalTxId}' has already been assigned to ${studentName}${rollNo} in record.`
        });
      }
    }
  }

  const insertPayload: any = {
    student_id, amount: Number(amount) || 0, payment_mode, transaction_id: finalTxId, academic_term, transaction_date, bank_account
  };
  if (req.body.created_at) {
    insertPayload.created_at = req.body.created_at;
  } else if (transaction_date && transaction_date.includes('T')) {
    insertPayload.created_at = transaction_date;
  }

  let { data: inserted, error } = await supabase.from("transactions").insert(insertPayload).select().single();

  if (error && (error.message?.includes("bank_account") || error.message?.includes("schema cache"))) {
    console.warn("[SUPABASE SCHEMA COMPATIBILITY] Retrying transaction insert without bank_account column:", error.message);
    delete insertPayload.bank_account;
    const retryRes = await supabase.from("transactions").insert(insertPayload).select().single();
    inserted = retryRes.data;
    error = retryRes.error;
  }
  
  if (error) {
    if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return res.status(400).json({
        error: "DUPLICATE_TRANSACTION_ID",
        message: `Duplicate Transaction ID! Transaction ID '${finalTxId}' has already been assigned to another student in record.`
      });
    }
    return res.status(500).json({ error: "SERVER_ERROR", message: error.message });
  }
  res.json({ success: true, id: inserted?.id, transaction_id: finalTxId });
}));

// High-speed Bulk Transactions Endpoint
apiRouter.post("/transactions/bulk", asyncHandler(async (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: "INVALID_PAYLOAD", message: "Transactions array is required and cannot be empty." });
  }

  const savedList: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const finalTxId = t.transaction_id ? String(t.transaction_id).trim() : `CASH_${Date.now()}_${i + 1}`;
    const insertPayload: any = {
      student_id: Number(t.student_id),
      amount: Number(t.amount) || 0,
      payment_mode: t.payment_mode || 'Cash',
      transaction_id: finalTxId,
      academic_term: t.academic_term || '2026-27',
      transaction_date: t.transaction_date || new Date().toISOString().split('T')[0],
      bank_account: t.bank_account || ''
    };
    if (t.created_at) insertPayload.created_at = t.created_at;

    let { data: inserted, error } = await supabase.from("transactions").insert(insertPayload).select().single();
    if (error && (error.message?.includes("bank_account") || error.message?.includes("schema cache"))) {
      delete insertPayload.bank_account;
      const retryRes = await supabase.from("transactions").insert(insertPayload).select().single();
      inserted = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      errors.push(`Transaction #${i + 1}: ${error.message}`);
    } else if (inserted) {
      savedList.push(inserted);
    }
  }

  res.json({ success: true, count: savedList.length, savedList, errors });
}));

// PDF Collection Sheet Parser Endpoint powered by Gemini AI
apiRouter.post("/parse-collection-pdf", asyncHandler(async (req, res) => {
  const { pdfBase64, pdfText } = req.body;

  if (!pdfBase64 && !pdfText) {
    return res.status(400).json({ error: "MISSING_DATA", message: "pdfBase64 or pdfText is required." });
  }

  // Retrieve all students for student matching
  const { data: dbStudents } = await supabase.from("students").select("id, name, roll_no, phone");
  const studentsList = dbStudents || [];

  let extractedRows: any[] = [];

  try {
    const aiKey = process.env.GEMINI_API_KEY;
    if (aiKey) {
      const ai = new GoogleGenAI({
        apiKey: aiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const contents: any[] = [];

      if (pdfBase64) {
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
        contents.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64
          }
        });
      }

      contents.push({
        text: `You are an expert financial auditor & accounting AI assistant for Maya Group of Institutions.
Analyze this financial collections data sheet PDF / report and extract every transaction / fee payment record line item.

${pdfText ? `PDF Text Content:\n${pdfText}\n` : ''}

Note: The PDF collection sheet may come in two formats:
- FORMAT 1 (8 Columns): [S.No, Student Name, Roll / ID No, Amount, Payment Mode, Transaction ID / UTR, Date, Remarks]
- FORMAT 2 (4 Columns): [Student, Transaction, Amount, Date]

If the PDF is in FORMAT 2 (or is missing columns like Roll/ID No, Payment Mode, or Remarks), automatically bridge & normalize the data to be 100% compatible with FORMAT 1 by adding logical dummy/default values:
1. student_identifier: Full Name, Roll No, or Student Identifier.
2. roll_no: Roll or ID Number if present; if missing, generate a realistic Roll No (e.g. "CS-2026-101").
3. amount: Numeric payment amount collected (e.g. 15000).
4. payment_mode: "Cash", "UPI", "Bank Transfer", "Online", "DD", or "Cheque". If unspecified, infer from transaction string or default to "UPI" / "Cash".
5. transaction_id: UTR / Receipt / Transaction Ref. If unspecified, use "TXN_" + random digits.
6. transaction_date: Date in YYYY-MM-DD format (if unspecified, current date ${new Date().toISOString().split('T')[0]}).
7. fee_head_or_notes: Remarks / Fee head (e.g. "Tuition Fee Collection").

Return a valid JSON array of objects.`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                student_identifier: { type: Type.STRING },
                roll_no: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                payment_mode: { type: Type.STRING },
                transaction_id: { type: Type.STRING },
                transaction_date: { type: Type.STRING },
                fee_head_or_notes: { type: Type.STRING }
              },
              required: ["student_identifier", "amount"]
            }
          }
        }
      });

      if (response.text) {
        extractedRows = JSON.parse(response.text.trim());
      }
    }
  } catch (err: any) {
    console.error("[GEMINI PDF PARSE ERROR]", err);
  }

  // Intelligent matching & dummy text enrichment against student directory
  const matchedRecords = [];
  for (let index = 0; index < extractedRows.length; index++) {
    const row = extractedRows[index];
    const rawIdentifier = String(row.student_identifier || '').trim() || 'Student';
    const cleanLowerIdent = rawIdentifier.toLowerCase();

    // Match by roll_no
    let matchedStudent = studentsList.find((s: any) => 
      s.roll_no && s.roll_no.trim().toLowerCase() === cleanLowerIdent
    );

    // Match by student name
    if (!matchedStudent) {
      matchedStudent = studentsList.find((s: any) => 
        s.name && (s.name.trim().toLowerCase() === cleanLowerIdent || cleanLowerIdent.includes(s.name.trim().toLowerCase()))
      );
    }

    // Partial roll_no match
    if (!matchedStudent && rawIdentifier.length >= 3) {
      matchedStudent = studentsList.find((s: any) => 
        s.roll_no && s.roll_no.toLowerCase().includes(cleanLowerIdent)
      );
    }

    // Synthesize dummy values for missing fields to ensure compatibility
    const finalRollNo = row.roll_no && row.roll_no.trim() 
      ? row.roll_no.trim() 
      : (matchedStudent && matchedStudent.roll_no 
          ? matchedStudent.roll_no 
          : `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`);

    if (!matchedStudent && rawIdentifier) {
      try {
        const { data: newSt } = await supabase.from("students").insert({
          name: rawIdentifier,
          roll_no: finalRollNo,
          phone: '',
          guardian_name: 'Parent / Guardian',
          created_at: new Date().toISOString()
        }).select().single();

        if (newSt) {
          matchedStudent = newSt;
          studentsList.push(newSt);
        }
      } catch (err) {
        console.warn("[PDF AUTO STUDENT CREATE ERR]", err);
      }
    }

    const rawTxn = row.transaction_id ? String(row.transaction_id).trim() : '';
    let inferredPaymentMode = row.payment_mode || '';
    if (!inferredPaymentMode) {
      if (rawTxn.toUpperCase().includes('UPI') || rawTxn.toUpperCase().includes('PAYTM') || rawTxn.toUpperCase().includes('GPAY')) {
        inferredPaymentMode = 'UPI';
      } else if (rawTxn.toUpperCase().includes('NEFT') || rawTxn.toUpperCase().includes('RTGS') || rawTxn.toUpperCase().includes('IMPS')) {
        inferredPaymentMode = 'Bank Transfer';
      } else if (rawTxn.toUpperCase().includes('CHQ') || rawTxn.toUpperCase().includes('CHEQUE')) {
        inferredPaymentMode = 'Cheque';
      } else {
        inferredPaymentMode = index % 2 === 0 ? 'UPI' : 'Cash';
      }
    }

    const finalTxnId = rawTxn || (inferredPaymentMode === 'UPI' ? `UPI_REF_${Math.floor(100000 + Math.random() * 900000)}` : `CASH_REC_${Math.floor(1000 + Math.random() * 9000)}`);
    const finalRemarks = row.fee_head_or_notes || 'Tuition Fee Collection';

    matchedRecords.push({
      id: `extracted_${index}_${Date.now()}`,
      raw_identifier: rawIdentifier,
      matched_student_id: matchedStudent ? matchedStudent.id : null,
      matched_student_name: matchedStudent ? matchedStudent.name : rawIdentifier,
      matched_roll_no: finalRollNo,
      amount: Number(row.amount) || 0,
      payment_mode: inferredPaymentMode,
      transaction_id: finalTxnId,
      transaction_date: row.transaction_date || new Date().toISOString().split('T')[0],
      fee_head_or_notes: finalRemarks,
      academic_term: '2026-27'
    });
  }

  res.json({
    success: true,
    total_parsed: matchedRecords.length,
    records: matchedRecords
  });
}));

apiRouter.put("/transactions/:id", asyncHandler(async (req, res) => {
  const { student_id, amount, payment_mode, transaction_id, academic_term, transaction_date, bank_account, edited_by = "Accountant" } = req.body;
  
  let cleanTxId = transaction_id ? String(transaction_id).trim() : '';

  if (cleanTxId) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("id, student_id, student:students(name, roll_no)")
      .eq("transaction_id", cleanTxId)
      .neq("id", req.params.id)
      .maybeSingle();

    if (existing) {
      const studentInfo = (existing as any)?.student;
      const studentName = studentInfo?.name ? studentInfo.name : 'another student';
      const rollNo = studentInfo?.roll_no ? ` (Roll No: ${studentInfo.roll_no})` : '';
      return res.status(400).json({
        error: "DUPLICATE_TRANSACTION_ID",
        message: `Duplicate Transaction ID! Transaction ID '${cleanTxId}' has already been assigned to ${studentName}${rollNo} in record.`
      });
    }
  }

  // Retrieve existing transaction for previous_data audit
  const { data: existing } = await supabase
    .from("transactions")
    .select(`
      *,
      student:students(name, roll_no)
    `)
    .eq("id", req.params.id)
    .maybeSingle();

  const prevData = req.body.previous_data || (existing ? {
    student_id: existing.student_id,
    amount: existing.amount,
    payment_mode: existing.payment_mode,
    transaction_id: existing.transaction_id,
    academic_term: existing.academic_term,
    transaction_date: existing.transaction_date,
    bank_account: existing.bank_account,
    student_name: existing.student?.name || existing.student_name,
    roll_no: existing.student?.roll_no || existing.roll_no
  } : null);

  const updatePayload: any = {
    student_id, amount, payment_mode, transaction_id: cleanTxId, academic_term, transaction_date, bank_account,
    is_edited: true,
    edited_by,
    edited_at: new Date().toISOString()
  };

  if (prevData) {
    updatePayload.previous_data = prevData;
  }

  let { error } = await supabase.from("transactions").update(updatePayload).eq("id", req.params.id);

  if (error && (error.message?.includes("bank_account") || error.message?.includes("schema cache"))) {
    console.warn("[SUPABASE SCHEMA COMPATIBILITY] Retrying transaction update without bank_account column:", error.message);
    delete updatePayload.bank_account;
    const retryUpd = await supabase.from("transactions").update(updatePayload).eq("id", req.params.id);
    error = retryUpd.error;
  }

  if (error) return res.status(400).json({ error: "Update failed", message: error.message });
  res.json({ success: true });
}));

apiRouter.delete("/transactions/clear-all", asyncHandler(async (req, res) => {
  const { error, count } = await supabase.from("transactions").delete().gt("id", -1);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: "All financial collection transaction records deleted successfully." });
}));

apiRouter.post("/transactions/delete-bulk", asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "INVALID_PAYLOAD", message: "ids array is required." });
  }
  const { error } = await supabase.from("transactions").delete().in("id", ids);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, count: ids.length, message: `Successfully deleted ${ids.length} collection records.` });
}));

apiRouter.delete("/transactions/:id", asyncHandler(async (req, res) => {
  const { error } = await supabase.from("transactions").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}));

// Reports
apiRouter.get("/summary", asyncHandler(async (req, res) => {
  const { data: txs } = await supabase.from("transactions").select("amount, student_id, created_at, transaction_date");
  const { data: students } = await supabase.from("students").select("id, name, roll_no, plan_id");
  const { data: plans } = await supabase.from("fee_plans").select("id, name, total_amount");

  const totalCollections = txs?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
  const studentCount = students?.length || 0;
  const planCount = plans?.length || 0;

  // Student plan mapping
  const studentPlanMap = new Map<number, number>();
  students?.forEach(s => {
    if (s.id && s.plan_id) studentPlanMap.set(Number(s.id), Number(s.plan_id));
  });

  // Fee plan total amount and name map
  const planAmountMap = new Map<number, number>();
  plans?.forEach(p => {
    if (p.id) {
      planAmountMap.set(Number(p.id), Number(p.total_amount || 0));
    }
  });

  // Total Revenue = sum of plan total_amount for all enrolled students
  let totalRevenue = 0;
  students?.forEach(s => {
    const pAmt = planAmountMap.get(Number(s.plan_id)) || 0;
    totalRevenue += pAmt;
  });

  const outstandingDues = Math.max(0, totalRevenue - totalCollections);

  // Collections by Course/Plan
  const planCollectionsMap = new Map<number, number>();
  plans?.forEach(p => planCollectionsMap.set(Number(p.id), 0));

  txs?.forEach(t => {
    const pId = studentPlanMap.get(Number(t.student_id));
    if (pId !== undefined && planCollectionsMap.has(pId)) {
      planCollectionsMap.set(pId, (planCollectionsMap.get(pId) || 0) + Number(t.amount || 0));
    }
  });

  const collectionsByCourse = (plans || []).map(p => ({
    name: p.name || 'General',
    total: planCollectionsMap.get(Number(p.id)) || 0
  }));

  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select(`
      *,
      student:students(name, roll_no)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  const formattedRecent = recentTransactions?.map((t: any) => ({
    ...t,
    student_name: t.student?.name || t.student_name,
    roll_no: t.student?.roll_no || t.roll_no
  })) || [];

  const { data: editedTransactions } = await supabase
    .from("transactions")
    .select(`
      *,
      student:students(name, roll_no)
    `)
    .eq("is_edited", true)
    .order("edited_at", { ascending: false });

  const formattedEditedTxs = editedTransactions?.map((t: any) => ({
    ...t,
    student_name: t.student?.name || t.student_name,
    roll_no: t.student?.roll_no || t.roll_no
  })) || [];

  const { data: editedStudents } = await supabase
    .from("students")
    .select(`
      *,
      plan:fee_plans(name),
      branch:branches(name),
      semester:semesters(name),
      session:sessions(name)
    `)
    .eq("is_edited", true)
    .order("edited_at", { ascending: false });

  const formattedEditedStudents = editedStudents?.map((s: any) => ({
    ...s,
    plan_name: s.plan?.name || s.plan_name,
    branch_name: s.branch?.name || s.branch_name,
    semester_name: s.semester?.name || s.semester_name,
    session_name: s.session?.name || s.session_name
  })) || [];

  res.json({
    totalRevenue,
    totalCollections,
    outstandingDues,
    studentCount,
    planCount,
    collectionsByCourse,
    editedTxCount: formattedEditedTxs.length,
    editedStudentCount: formattedEditedStudents.length,
    recentTransactions: formattedRecent,
    editedTransactions: formattedEditedTxs,
    editedStudents: formattedEditedStudents
  });
}));

// Serves official app logo icon for PWA/APK download (dynamic from database org_settings)
apiRouter.get("/app-icon", asyncHandler(async (req, res) => {
  try {
    const { data: settings } = await supabase.from("org_settings").select("logo").eq("id", 1).maybeSingle();
    if (settings?.logo && typeof settings.logo === 'string' && settings.logo.trim()) {
      const logoStr = settings.logo.trim();
      if (logoStr.startsWith("data:image/")) {
        const matches = logoStr.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          return res.send(buffer);
        }
      } else if (logoStr.startsWith("http://") || logoStr.startsWith("https://")) {
        return res.redirect(logoStr);
      }
    }
  } catch (err) {
    console.error("Error retrieving logo from org_settings:", err);
  }

  const iconPath = path.join(__dirname, "src", "assets", "images", "maya_group_logo_1785679886112.jpg");
  if (fs.existsSync(iconPath)) {
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(iconPath);
  }
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="192" height="192">
    <circle cx="50" cy="50" r="48" fill="#0284c7" stroke="#fbbf24" stroke-width="3"/>
    <text x="50" y="55" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">MAYA</text>
  </svg>`);
}));

// Mobile App PWA / App Installer route (No package manager needed)
apiRouter.get("/download-apk", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MAYA GROUP OF INSTITUTIONS - Mobile App Installer</title>
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/api/app-icon" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4 font-sans">
  <div class="max-w-md w-full bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl text-center space-y-5">
    <div class="w-20 h-20 bg-white rounded-2xl mx-auto p-1 shadow-xl flex items-center justify-center overflow-hidden">
      <img src="/api/app-icon" alt="Logo" class="w-full h-full object-contain rounded-xl" />
    </div>
    <div>
      <h1 class="text-xl font-black text-white">MAYA GROUP OF INSTITUTIONS</h1>
      <p class="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-1">Official Mobile Application</p>
    </div>
    <div class="bg-slate-900/80 rounded-2xl p-4 text-left border border-slate-700/80 space-y-3">
      <div class="flex items-start gap-3">
        <span class="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">1</span>
        <p class="text-xs text-slate-300">Tap browser menu <strong>(⋮ or Share icon)</strong> at the top/bottom.</p>
      </div>
      <div class="flex items-start gap-3">
        <span class="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">2</span>
        <p class="text-xs text-slate-300">Select <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</p>
      </div>
      <div class="flex items-start gap-3">
        <span class="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">3</span>
        <p class="text-xs text-slate-300">Launch <strong>MAYA GROUP OF INSTITUTIONS</strong> instantly from your mobile home screen!</p>
      </div>
    </div>
    <div class="pt-2">
      <a href="/" class="block w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all">
        Open Mobile App Now
      </a>
    </div>
    <p class="text-[10px] text-slate-400 font-semibold">
      Zero package installation errors • Works on all Android & iOS devices
    </p>
  </div>
</body>
</html>`);
});

apiRouter.get("/ledger", asyncHandler(async (req, res) => {
  const { data: students, error } = await supabase
    .from("students")
    .select(`
      id,
      name,
      roll_no,
      guardian_name,
      phone,
      is_edited,
      edited_by,
      edited_at,
      previous_data,
      plan:fee_plans(id, name, total_amount),
      branch:branches(name),
      semester:semesters(name),
      session:sessions(name),
      transactions(*)
    `);
    
  if (error) throw error;
  
  const ledger = (students || []).map((s: any) => {
    const rawTxs = (s.transactions || []).sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.transaction_date).getTime();
      const dateB = new Date(b.created_at || b.transaction_date).getTime();
      return dateA - dateB;
    });

    let runningPaid = 0;
    const planTotal = Number(s.plan?.total_amount || 0);

    const txHistory = rawTxs.map((t: any) => {
      runningPaid += Number(t.amount || 0);
      return {
        ...t,
        amount: Number(t.amount || 0),
        running_paid: runningPaid,
        running_balance: planTotal - runningPaid
      };
    });

    return {
      id: s.id,
      name: s.name,
      roll_no: s.roll_no,
      guardian_name: s.guardian_name,
      phone: s.phone,
      plan_name: s.plan?.name,
      branch_name: s.branch?.name,
      semester_name: s.semester?.name,
      session_name: s.session?.name,
      is_edited: s.is_edited,
      edited_by: s.edited_by,
      edited_at: s.edited_at,
      previous_data: s.previous_data,
      total_due: planTotal,
      total_paid: runningPaid,
      balance: planTotal - runningPaid,
      transactions: txHistory
    };
  });
  
  res.json(ledger);
}));

// Serve PWA manifest and service worker
app.get("/manifest.json", (req, res) => {
  const manifestPath = path.join(__dirname, "public", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    res.setHeader("Content-Type", "application/json");
    return res.sendFile(manifestPath);
  }
  res.json({
    short_name: "DCfeePay",
    name: "Maya Group of Institutions - DCfeePay Fee Portal",
    start_url: "/",
    background_color: "#059669",
    theme_color: "#059669",
    display: "standalone",
    icons: [{ src: "/api/app-icon", sizes: "192x192", type: "image/jpeg" }]
  });
});

app.get("/sw.js", (req, res) => {
  const swPath = path.join(__dirname, "public", "sw.js");
  if (fs.existsSync(swPath)) {
    res.setHeader("Content-Type", "application/javascript");
    return res.sendFile(swPath);
  }
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    self.addEventListener('install', e => self.skipWaiting());
    self.addEventListener('activate', e => self.clients.claim());
  `);
});

// Mount the router
app.use("/api", apiRouter);

// API Catch-all for 404s
app.all("/api/*", (req, res) => {
  console.log(`[404] API: ${req.method} ${req.path}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// Global JSON error handler for Express
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[GLOBAL SERVER ERROR]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err?.message || 'An unexpected server error occurred.'
  });
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
    // Sync admin and ghazi accountant credentials on startup
    supabase.from("staff").update({ password: '12345' }).eq("staff_id", "admin")
      .then(() => console.log("[INIT] Admin password synced"))
      .catch(err => console.error("[INIT] Failed to sync admin password:", err));

    supabase.from("staff").select("id").ilike("staff_id", "ghazi").maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          await supabase.from("staff").update({ password: "mayaghazi@123", role: "accountant" }).eq("id", data.id);
          console.log("[INIT] Ghazi accountant account updated");
        } else {
          await supabase.from("staff").insert({ staff_id: "ghazi", name: "Ghazi Accountant", password: "mayaghazi@123", role: "accountant" });
          console.log("[INIT] Ghazi accountant account created");
        }
      })
      .catch(err => console.error("[INIT] Failed to sync ghazi account:", err));
  });
}

// Initialize server logic
startApp().catch(err => {
  console.error("Failed to start app:", err);
});

export default app;
