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

-- Disable RLS for all tables to allow the server to manage data
-- Run these in the Supabase SQL Editor if you encounter "violates row-level security policy" errors
ALTER TABLE org_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE semesters DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE fee_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE fee_heads DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
