-- Create table for multiple cook assignments per order
CREATE TABLE public.order_assigned_cooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  cook_id UUID NOT NULL REFERENCES public.cooks(id) ON DELETE CASCADE,
  cook_status TEXT NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, cook_id)
);

-- Enable RLS
ALTER TABLE public.order_assigned_cooks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage order cook assignments"
ON public.order_assigned_cooks
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cooks can view their own assignments"
ON public.order_assigned_cooks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cooks c 
    WHERE c.id = order_assigned_cooks.cook_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Cooks can update their own assignment status"
ON public.order_assigned_cooks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cooks c 
    WHERE c.id = order_assigned_cooks.cook_id 
    AND c.user_id = auth.uid()
  )
);

-- Index for performance
CREATE INDEX idx_order_assigned_cooks_order_id ON public.order_assigned_cooks(order_id);
CREATE INDEX idx_order_assigned_cooks_cook_id ON public.order_assigned_cooks(cook_id);
CREATE INDEX idx_order_assigned_cooks_status ON public.order_assigned_cooks(cook_status);