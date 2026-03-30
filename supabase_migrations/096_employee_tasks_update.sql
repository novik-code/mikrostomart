-- Employee Tasks table for task management system
-- Phase 1: Task CRUD with schedule integration

CREATE TABLE IF NOT EXISTS employee_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','urgent')),
  
  -- Patient/Appointment linking
  patient_id TEXT,
  patient_name TEXT,
  appointment_type TEXT,
  
  -- Due date (integrated with schedule)
  due_date TIMESTAMPTZ,
  linked_appointment_date TIMESTAMPTZ,
  linked_appointment_info TEXT,
  
  -- Employee assignment
  assigned_to_doctor_id TEXT,
  assigned_to_doctor_name TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all tasks
CREATE POLICY "Authenticated users can read tasks"
  ON employee_tasks FOR SELECT
  TO authenticated
  USING (true);

-- Policy: authenticated users can insert tasks
CREATE POLICY "Authenticated users can insert tasks"
  ON employee_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: authenticated users can update tasks
CREATE POLICY "Authenticated users can update tasks"
  ON employee_tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: authenticated users can delete tasks
CREATE POLICY "Authenticated users can delete tasks"
  ON employee_tasks FOR DELETE
  TO authenticated
  USING (true);

-- Index for common queries
CREATE INDEX idx_employee_tasks_status ON employee_tasks(status);
CREATE INDEX idx_employee_tasks_assigned ON employee_tasks(assigned_to_doctor_id);
CREATE INDEX idx_employee_tasks_due_date ON employee_tasks(due_date);
CREATE INDEX idx_employee_tasks_patient ON employee_tasks(patient_id);
