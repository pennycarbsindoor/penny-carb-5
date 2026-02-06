-- Allow authenticated users (customers) to view cook dish allocations
-- This is needed for the customer cloud kitchen page to show which cooks offer which dishes
CREATE POLICY "Authenticated users can view cook dishes for ordering" 
ON public.cook_dishes 
FOR SELECT 
TO authenticated
USING (true);