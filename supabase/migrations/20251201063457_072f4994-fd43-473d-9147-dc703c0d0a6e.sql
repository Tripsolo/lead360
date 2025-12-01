-- Drop existing public RLS policies
DROP POLICY IF EXISTS "Allow public read access to brands" ON brands;
DROP POLICY IF EXISTS "Allow public read access to projects" ON projects;
DROP POLICY IF EXISTS "Allow public read access to leads" ON leads;
DROP POLICY IF EXISTS "Allow public read access to lead_analyses" ON lead_analyses;

-- Create authenticated-only policies for brands
CREATE POLICY "Authenticated users can read brands"
ON brands FOR SELECT TO authenticated USING (true);

-- Create authenticated-only policies for projects
CREATE POLICY "Authenticated users can read projects"
ON projects FOR SELECT TO authenticated USING (true);

-- Create authenticated-only policies for leads
CREATE POLICY "Authenticated users can read leads"
ON leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert leads"
ON leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Create authenticated-only policies for lead_analyses
CREATE POLICY "Authenticated users can read analyses"
ON lead_analyses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert analyses"
ON lead_analyses FOR INSERT TO authenticated WITH CHECK (true);