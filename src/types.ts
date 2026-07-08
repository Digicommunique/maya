export interface OrgSettings {
  name: string;
  logo: string;
  address: string;
  phone: string;
}

export interface Semester {
  id: number;
  name: string;
}

export interface Session {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface Staff {
  id: number;
  staff_id: string;
  name: string;
  password?: string;
  role: string;
}

export interface FeeHead {
  id?: number;
  name: string;
  amount: number;
}

export interface FeePlan {
  id: number;
  name: string;
  frequency: string;
  total_amount: number;
  heads?: FeeHead[];
}

export interface Student {
  id: number;
  name: string;
  guardian_name: string;
  roll_no: string;
  phone: string;
  plan_id: number;
  branch_id: number;
  semester_id: number;
  session_id: number;
  plan_name?: string;
  branch_name?: string;
  semester_name?: string;
  session_name?: string;
}

export interface Transaction {
  id: number;
  student_id: number;
  amount: number;
  payment_mode: string;
  transaction_id: string;
  academic_term: string;
  transaction_date?: string;
  bank_account?: string;
  created_at: string;
  student_name?: string;
  roll_no?: string;
  branch_name?: string;
  semester_name?: string;
  guardian_name?: string;
}
