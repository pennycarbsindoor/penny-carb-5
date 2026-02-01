-- Allow cooks to view customer profiles for their assigned orders
CREATE POLICY "Cooks can view customer profiles for assigned orders"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM order_assigned_cooks oac
    JOIN orders o ON o.id = oac.order_id
    JOIN cooks c ON c.id = oac.cook_id
    WHERE c.user_id = auth.uid()
      AND o.customer_id = profiles.user_id
  )
);