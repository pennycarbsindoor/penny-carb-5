-- Fix wallet data for delivery 2 based on their delivered orders
UPDATE delivery_wallets 
SET 
  collected_amount = 460,  -- 230 + 130 + 100 from delivered orders
  job_earnings = 60,       -- 30 + 30 + 0 from delivery charges
  updated_at = now()
WHERE delivery_staff_id = 'c7996ca7-f2e4-49c9-a820-95dda58adfef';