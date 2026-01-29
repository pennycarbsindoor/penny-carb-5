-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('food-categories', 'food-categories', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('food-items', 'food-items', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('kitchen-logos', 'kitchen-logos', true);

-- RLS Policies for banners bucket
CREATE POLICY "Anyone can view banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

CREATE POLICY "Admins can upload banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banners' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'banners' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'banners' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- RLS Policies for food-categories bucket
CREATE POLICY "Anyone can view food categories images"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-categories');

CREATE POLICY "Admins can upload food category images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'food-categories' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update food category images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'food-categories' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete food category images"
ON storage.objects FOR DELETE
USING (bucket_id = 'food-categories' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- RLS Policies for food-items bucket
CREATE POLICY "Anyone can view food item images"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-items');

CREATE POLICY "Admins can upload food item images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'food-items' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cook'::app_role)));

CREATE POLICY "Admins can update food item images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'food-items' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cook'::app_role)));

CREATE POLICY "Admins can delete food item images"
ON storage.objects FOR DELETE
USING (bucket_id = 'food-items' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cook'::app_role)));

-- RLS Policies for kitchen-logos bucket
CREATE POLICY "Anyone can view kitchen logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'kitchen-logos');

CREATE POLICY "Admins and cooks can upload kitchen logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kitchen-logos' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cook'::app_role)));

CREATE POLICY "Admins and cooks can update kitchen logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'kitchen-logos' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cook'::app_role)));

CREATE POLICY "Admins and cooks can delete kitchen logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'kitchen-logos' AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cook'::app_role)));