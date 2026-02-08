import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_vegetarian: boolean;
  category_id: string | null;
  serves_persons?: number | null;
  platform_margin_type?: string | null;
  platform_margin_value?: number | null;
  category?: {
    id: string;
    name: string;
  };
  images?: {
    id: string;
    image_url: string;
    is_primary: boolean;
  }[];
}

export interface FoodCategory {
  id: string;
  name: string;
  image_url: string | null;
  display_order: number;
}

export function useIndoorEventItems() {
  return useQuery({
    queryKey: ['indoor-event-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select(`
          id,
          name,
          description,
          price,
          is_vegetarian,
          category_id,
          serves_persons,
          platform_margin_type,
          platform_margin_value,
          food_categories!category_id (
            id,
            name
          ),
          food_item_images (
            id,
            image_url,
            is_primary
          )
        `)
        .eq('service_type', 'indoor_events')
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        platform_margin_type: item.platform_margin_type,
        platform_margin_value: item.platform_margin_value,
        category: item.food_categories,
        images: item.food_item_images,
      })) as FoodItem[];
    },
  });
}

export function useIndoorEventCategories() {
  return useQuery({
    queryKey: ['indoor-event-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_categories')
        .select('*')
        .eq('is_active', true)
        .or('service_type.eq.indoor_events,service_types.cs.{indoor_events}')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as FoodCategory[];
    },
  });
}
