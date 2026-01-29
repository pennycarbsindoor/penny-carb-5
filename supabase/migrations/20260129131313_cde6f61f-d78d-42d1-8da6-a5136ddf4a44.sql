-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'cook', 'delivery_staff', 'customer');

-- Create service type enum
CREATE TYPE public.service_type AS ENUM ('indoor_events', 'cloud_kitchen', 'homemade');

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Panchayat master table
CREATE TABLE public.panchayats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ward master table (mapped to Panchayat)
CREATE TABLE public.wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panchayat_id UUID REFERENCES public.panchayats(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    ward_number INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (panchayat_id, name)
);

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    mobile_number TEXT NOT NULL UNIQUE,
    panchayat_id UUID REFERENCES public.panchayats(id),
    ward_id UUID REFERENCES public.wards(id),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin permissions table
CREATE TABLE public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    can_manage_orders BOOLEAN NOT NULL DEFAULT false,
    can_register_cooks BOOLEAN NOT NULL DEFAULT false,
    can_register_delivery_staff BOOLEAN NOT NULL DEFAULT false,
    can_assign_orders BOOLEAN NOT NULL DEFAULT false,
    can_approve_settlements BOOLEAN NOT NULL DEFAULT false,
    can_access_reports BOOLEAN NOT NULL DEFAULT false,
    can_manage_items BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- Food categories table
CREATE TABLE public.food_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    service_type service_type NOT NULL,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Food items table
CREATE TABLE public.food_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.food_categories(id),
    service_type service_type NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_vegetarian BOOLEAN NOT NULL DEFAULT false,
    is_available BOOLEAN NOT NULL DEFAULT true,
    min_images INTEGER NOT NULL DEFAULT 1,
    max_images INTEGER NOT NULL DEFAULT 5,
    preparation_time_minutes INTEGER,
    created_by UUID REFERENCES auth.users(id),
    panchayat_id UUID REFERENCES public.panchayats(id),
    ward_id UUID REFERENCES public.wards(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Food item images table
CREATE TABLE public.food_item_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Banners table for promotions
CREATE TABLE public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    service_type service_type,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES auth.users(id) NOT NULL,
    service_type service_type NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_address TEXT,
    delivery_instructions TEXT,
    panchayat_id UUID REFERENCES public.panchayats(id) NOT NULL,
    ward_id UUID REFERENCES public.wards(id) NOT NULL,
    assigned_cook_id UUID REFERENCES auth.users(id),
    assigned_delivery_id UUID REFERENCES auth.users(id),
    event_date TIMESTAMP WITH TIME ZONE,
    event_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    food_item_id UUID REFERENCES public.food_items(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cart table
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, food_item_id)
);

-- Settlements table for cook/delivery payments
CREATE TABLE public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    panchayat_id UUID REFERENCES public.panchayats(id),
    ward_id UUID REFERENCES public.wards(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.panchayats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for panchayats (public read)
CREATE POLICY "Anyone can view active panchayats" ON public.panchayats
    FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins and admins can manage panchayats" ON public.panchayats
    FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for wards (public read)
CREATE POLICY "Anyone can view active wards" ON public.wards
    FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins and admins can manage wards" ON public.wards
    FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for admin_permissions
CREATE POLICY "Super admins can manage permissions" ON public.admin_permissions
    FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view their own permissions" ON public.admin_permissions
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for food_categories (public read)
CREATE POLICY "Anyone can view active categories" ON public.food_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.food_categories
    FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for food_items (public read for available items)
CREATE POLICY "Anyone can view available items" ON public.food_items
    FOR SELECT USING (is_available = true);

CREATE POLICY "Admins can manage all items" ON public.food_items
    FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Cooks can manage their own items" ON public.food_items
    FOR ALL USING (
        public.has_role(auth.uid(), 'cook') AND created_by = auth.uid()
    );

-- RLS Policies for food_item_images
CREATE POLICY "Anyone can view item images" ON public.food_item_images
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage item images" ON public.food_item_images
    FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for banners (public read for active)
CREATE POLICY "Anyone can view active banners" ON public.banners
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage banners" ON public.banners
    FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for orders
CREATE POLICY "Customers can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Admins can manage orders" ON public.orders
    FOR UPDATE USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Cooks can view assigned orders" ON public.orders
    FOR SELECT USING (
        public.has_role(auth.uid(), 'cook') AND assigned_cook_id = auth.uid()
    );

CREATE POLICY "Delivery staff can view assigned orders" ON public.orders
    FOR SELECT USING (
        public.has_role(auth.uid(), 'delivery_staff') AND assigned_delivery_id = auth.uid()
    );

-- RLS Policies for order_items
CREATE POLICY "Users can view their order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.customer_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.customer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage order items" ON public.order_items
    FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for cart_items
CREATE POLICY "Users can manage their own cart" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for settlements
CREATE POLICY "Users can view their own settlements" ON public.settlements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage settlements" ON public.settlements
    FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_panchayats_updated_at BEFORE UPDATE ON public.panchayats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON public.wards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_permissions_updated_at BEFORE UPDATE ON public.admin_permissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_categories_updated_at BEFORE UPDATE ON public.food_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON public.food_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.settlements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create order number generation function
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'PC' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Add trigger for order number
CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Create indexes for performance
CREATE INDEX idx_profiles_panchayat ON public.profiles(panchayat_id);
CREATE INDEX idx_profiles_ward ON public.profiles(ward_id);
CREATE INDEX idx_profiles_mobile ON public.profiles(mobile_number);
CREATE INDEX idx_wards_panchayat ON public.wards(panchayat_id);
CREATE INDEX idx_food_items_service_type ON public.food_items(service_type);
CREATE INDEX idx_food_items_category ON public.food_items(category_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_panchayat ON public.orders(panchayat_id);
CREATE INDEX idx_orders_ward ON public.orders(ward_id);
CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);