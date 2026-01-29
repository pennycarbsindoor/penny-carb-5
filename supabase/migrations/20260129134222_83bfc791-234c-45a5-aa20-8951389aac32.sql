-- Add ward_count to panchayats table
ALTER TABLE public.panchayats ADD COLUMN ward_count integer NOT NULL DEFAULT 25;

-- Change ward references from UUID to integer ward_number in profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ward_id_fkey;
ALTER TABLE public.profiles RENAME COLUMN ward_id TO ward_number;
ALTER TABLE public.profiles ALTER COLUMN ward_number TYPE integer USING NULL;

-- Change ward references in orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_ward_id_fkey;
ALTER TABLE public.orders RENAME COLUMN ward_id TO ward_number;
ALTER TABLE public.orders ALTER COLUMN ward_number TYPE integer USING 1;
ALTER TABLE public.orders ALTER COLUMN ward_number SET NOT NULL;

-- Change ward references in food_items
ALTER TABLE public.food_items DROP CONSTRAINT IF EXISTS food_items_ward_id_fkey;
ALTER TABLE public.food_items RENAME COLUMN ward_id TO ward_number;
ALTER TABLE public.food_items ALTER COLUMN ward_number TYPE integer USING NULL;

-- Change ward references in settlements
ALTER TABLE public.settlements DROP CONSTRAINT IF EXISTS settlements_ward_id_fkey;
ALTER TABLE public.settlements RENAME COLUMN ward_id TO ward_number;
ALTER TABLE public.settlements ALTER COLUMN ward_number TYPE integer USING NULL;

-- Drop the wards table as it's no longer needed
DROP TABLE IF EXISTS public.wards;

-- Add check constraints to ensure ward_number is within valid range
-- (These will be validated at application level since ward_count can vary)