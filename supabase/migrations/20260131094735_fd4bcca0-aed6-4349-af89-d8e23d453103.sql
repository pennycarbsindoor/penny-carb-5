-- Add RLS policy for cooks to view order items from their assigned orders
CREATE POLICY "Cooks can view order items for their assigned orders"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.order_assigned_cooks oac
    INNER JOIN public.cooks c ON c.id = oac.cook_id
    WHERE oac.order_id = order_items.order_id 
      AND c.user_id = auth.uid()
  )
);