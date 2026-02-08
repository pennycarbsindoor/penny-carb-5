import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, Leaf, UtensilsCrossed, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectedFood } from '@/pages/IndoorEventsPlanner';
import FoodQuantitySuggestionDialog from './FoodQuantitySuggestionDialog';
import { calculatePlatformMargin } from '@/lib/priceUtils';

// Helper to get customer price (base + margin)
const getCustomerPrice = (item: any): number => {
  const marginType = (item.platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = item.platform_margin_value || 0;
  const margin = calculatePlatformMargin(item.price, marginType, marginValue);
  return item.price + margin;
};

interface FoodSelectionStepProps {
  selectedFoods: SelectedFood[];
  guestCount: number;
  onUpdateFoods: (foods: SelectedFood[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface FoodItemForSuggestion {
  id: string;
  name: string;
  price: number;
  serves_persons: number | null;
  category: string;
}

const FoodSelectionStep: React.FC<FoodSelectionStepProps> = ({
  selectedFoods,
  guestCount,
  onUpdateFoods,
  onNext,
  onBack,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [suggestionItem, setSuggestionItem] = useState<FoodItemForSuggestion | null>(null);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['food-categories-indoor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch food items for indoor events
  const { data: foodItems, isLoading } = useQuery({
    queryKey: ['food-items-indoor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*, food_item_images(*), food_categories(*), platform_margin_type, platform_margin_value')
        .eq('service_type', 'indoor_events')
        .eq('is_available', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const filteredItems = activeCategory === 'all'
    ? foodItems
    : foodItems?.filter((item) => item.category_id === activeCategory);

  const getSelectedQuantity = (itemId: string) => {
    return selectedFoods.find((f) => f.id === itemId)?.quantity || 0;
  };

  // Manual add - just increment by 1
  const handleAddFood = (item: any) => {
    const existing = selectedFoods.find((f) => f.id === item.id);
    const customerPrice = getCustomerPrice(item);
    
    if (existing) {
      onUpdateFoods(
        selectedFoods.map((f) =>
          f.id === item.id ? { ...f, quantity: f.quantity + 1 } : f
        )
      );
    } else {
      onUpdateFoods([
        ...selectedFoods,
        {
          id: item.id,
          name: item.name,
          price: customerPrice, // Store customer price (base + margin)
          quantity: 1,
          category: item.food_categories?.name || 'Other',
        },
      ]);
    }
  };

  // Auto calculate button - shows suggestion dialog
  const handleAutoCalculate = (item: any) => {
    const customerPrice = getCustomerPrice(item);
    setSuggestionItem({
      id: item.id,
      name: item.name,
      price: customerPrice, // Use customer price
      serves_persons: item.serves_persons,
      category: item.food_categories?.name || 'Other',
    });
    setShowSuggestionDialog(true);
  };

  // Accept suggested quantity
  const handleAcceptSuggestion = (quantity: number) => {
    if (!suggestionItem) return;
    
    const existing = selectedFoods.find((f) => f.id === suggestionItem.id);
    
    if (existing) {
      // Update existing item with suggested quantity
      onUpdateFoods(
        selectedFoods.map((f) =>
          f.id === suggestionItem.id ? { ...f, quantity } : f
        )
      );
    } else {
      // Add new item with suggested quantity
      onUpdateFoods([
        ...selectedFoods,
        {
          id: suggestionItem.id,
          name: suggestionItem.name,
          price: suggestionItem.price,
          quantity: quantity,
          category: suggestionItem.category,
        },
      ]);
    }
    
    setShowSuggestionDialog(false);
    setSuggestionItem(null);
  };

  // Cancel suggestion - close dialog, user can manually edit
  const handleCancelSuggestion = () => {
    setShowSuggestionDialog(false);
    setSuggestionItem(null);
  };

  const handleRemoveFood = (itemId: string) => {
    const existing = selectedFoods.find((f) => f.id === itemId);
    if (existing && existing.quantity > 1) {
      onUpdateFoods(
        selectedFoods.map((f) =>
          f.id === itemId ? { ...f, quantity: f.quantity - 1 } : f
        )
      );
    } else {
      onUpdateFoods(selectedFoods.filter((f) => f.id !== itemId));
    }
  };

  const foodTotal = selectedFoods.reduce(
    (sum, f) => sum + f.price * f.quantity,
    0
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Build Your Menu</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select dishes for {guestCount} guests
        </p>
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories?.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Food Items */}
      <div className="space-y-3 pb-24">
        {filteredItems?.map((item) => {
          const qty = getSelectedQuantity(item.id);
          const primaryImage = item.food_item_images?.find((img: any) => img.is_primary);
          const imageUrl = primaryImage?.image_url || item.food_item_images?.[0]?.image_url;

          return (
            <Card 
              key={item.id} 
              className={cn(
                "transition-all",
                qty > 0 && "border-indoor-events/50 bg-indoor-events/5"
              )}
            >
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {/* Image */}
                  <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <UtensilsCrossed className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1">
                          {item.is_vegetarian && (
                            <Leaf className="h-3 w-3 text-green-600" />
                          )}
                          <h4 className="font-medium text-sm truncate">
                            {item.name}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </p>
                        {/* Show serves info */}
                        {item.serves_persons && item.serves_persons > 1 && (
                          <p className="text-xs text-indoor-events/70 mt-0.5">
                            Serves {item.serves_persons} persons/unit
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-sm font-semibold text-indoor-events">
                          ₹{getCustomerPrice(item)}/plate
                        </p>
                        {qty > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {qty} units = ₹{(getCustomerPrice(item) * qty).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Add/Remove Controls */}
                      <div className="flex items-center gap-2">
                        {/* Auto Calculate Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-indoor-events hover:bg-indoor-events/10"
                          onClick={() => handleAutoCalculate(item)}
                          title="Auto calculate quantity"
                        >
                          <Wand2 className="h-4 w-4 mr-1" />
                          Auto
                        </Button>

                        {qty > 0 ? (
                          <div className="flex items-center gap-2 bg-indoor-events/10 rounded-full p-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full"
                              onClick={() => handleRemoveFood(item.id)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">
                              {qty}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full"
                              onClick={() => handleAddFood(item)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-indoor-events text-indoor-events hover:bg-indoor-events hover:text-white"
                            onClick={() => handleAddFood(item)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredItems?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No items available in this category
          </div>
        )}
      </div>

      {/* Selected Summary */}
      {selectedFoods.length > 0 && (
        <div className="fixed bottom-32 left-0 right-0 bg-card border-t border-b p-2">
          <div className="container flex flex-wrap gap-1">
            {selectedFoods.map((food) => (
              <Badge key={food.id} variant="secondary" className="text-xs">
                {food.name} x{food.quantity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          className="flex-1 bg-indoor-events hover:bg-indoor-events/90"
          onClick={onNext}
        >
          Continue
          {selectedFoods.length > 0 && ` (₹${foodTotal.toLocaleString()})`}
        </Button>
      </div>

      {/* Quantity Suggestion Dialog */}
      <FoodQuantitySuggestionDialog
        open={showSuggestionDialog}
        onOpenChange={setShowSuggestionDialog}
        item={suggestionItem}
        guestCount={guestCount}
        currentQuantity={0}
        onAccept={handleAcceptSuggestion}
        onCancel={handleCancelSuggestion}
      />
    </div>
  );
};

export default FoodSelectionStep;
