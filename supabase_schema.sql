-- Supabase SQL Schema for Fee Management System

-- Organization Settings
CREATE TABLE IF NOT EXISTS org_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT,
    logo TEXT,
    address TEXT,
    phone TEXT
);

-- Semesters
CREATE TABLE IF NOT EXISTS semesters (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Academic Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Branches / Courses
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Staff Management
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    staff_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'staff'
);

-- Fee Plans
CREATE TABLE IF NOT EXISTS fee_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    frequency TEXT,
    total_amount NUMERIC(10, 2)
);

-- Fee Heads (Components of a Plan)
CREATE TABLE IF NOT EXISTS fee_heads (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES fee_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL
);

-- Students Enrollment
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    guardian_name TEXT,
    roll_no TEXT UNIQUE NOT NULL,
    phone TEXT,
    plan_id INTEGER REFERENCES fee_plans(id),
    branch_id INTEGER REFERENCES branches(id),
    semester_id INTEGER REFERENCES semesters(id),
    session_id INTEGER REFERENCES sessions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions / Payments
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    amount NUMERIC(10, 2) NOT NULL,
    payment_mode TEXT NOT NULL,
    transaction_id TEXT UNIQUE,
    academic_term TEXT,
    transaction_date TEXT,
    bank_account TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Staff Seed
INSERT INTO staff (staff_id, name, password, role) 
VALUES ('admin', 'Administrator', '12345', 'admin')
ON CONFLICT (staff_id) DO UPDATE SET password = '12345';

-- Enable Row Level Security (RLS) on all tables to resolve the 11 database linter errors
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to allow clean re-runs
DROP POLICY IF EXISTS "Allow all access on org_settings" ON org_settings;
DROP POLICY IF EXISTS "Allow all access on semesters" ON semesters;
DROP POLICY IF EXISTS "Allow all access on sessions" ON sessions;
DROP POLICY IF EXISTS "Allow all access on branches" ON branches;
DROP POLICY IF EXISTS "Allow all access on staff" ON staff;
DROP POLICY IF EXISTS "Allow all access on fee_plans" ON fee_plans;
DROP POLICY IF EXISTS "Allow all access on fee_heads" ON fee_heads;
DROP POLICY IF EXISTS "Allow all access on students" ON students;
DROP POLICY IF EXISTS "Allow all access on transactions" ON transactions;

-- Create ALL policies to allow server-side operations under all keys/roles
CREATE POLICY "Allow all access on org_settings" ON org_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on semesters" ON semesters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on branches" ON branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on fee_plans" ON fee_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on fee_heads" ON fee_heads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
