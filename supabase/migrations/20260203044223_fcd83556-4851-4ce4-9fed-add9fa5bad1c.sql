-- Add assigned_panchayat_ids array column to delivery_staff table for multi-panchayat allocation
ALTER TABLE public.delivery_staff 
ADD COLUMN IF NOT EXISTS assigned_panchayat_ids uuid[] DEFAULT '{}';

-- Migrate existing panchayat_id to the new array column
UPDATE public.delivery_staff 
SET assigned_panchayat_ids = ARRAY[panchayat_id]
WHERE panchayat_id IS NOT NULL AND (assigned_panchayat_ids IS NULL OR assigned_panchayat_ids = '{}');

-- Add comment for clarity
COMMENT ON COLUMN public.delivery_staff.assigned_panchayat_ids IS 'Array of panchayat IDs that this delivery staff can serve';