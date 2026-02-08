import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, UtensilsCrossed, Leaf, ShoppingBasket } from 'lucide-react';
import { useIndoorEventItems, useIndoorEventCategories } from '@/hooks/useIndoorEventItems';
import FoodItemCard from './FoodItemCard';
import type { FoodItem } from '@/hooks/useIndoorEventItems';
import { calculatePlatformMargin } from '@/lib/priceUtils';

// Helper to get customer price (base + margin)
const getCustomerPrice = (item: FoodItem): number => {
  const marginType = (item.platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = item.platform_margin_value || 0;
  const margin = calculatePlatformMargin(item.price, marginType, marginValue);
  return item.price + margin;
};

interface SelectedItem {
  item: FoodItem;
  quantity: number;
}

interface QuickBookingFoodSelectionProps {
  selectedItems: Map<string, SelectedItem>;
  onItemsChange: (items: Map<string, SelectedItem>) => void;
  guestCount?: number;
}

const QuickBookingFoodSelection: React.FC<QuickBookingFoodSelectionProps> = ({
  selectedItems,
  onItemsChange,
  guestCount,
}) => {
  const { data: items, isLoading: itemsLoading } = useIndoorEventItems();
  const { data: categories, isLoading: categoriesLoading } = useIndoorEventCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
      // Search filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (selectedCategory && item.category_id !== selectedCategory) {
        return false;
      }
      
      // Veg filter
      if (vegOnly && !item.is_vegetarian) {
        return false;
      }
      
      return true;
    });
  }, [items, searchQuery, selectedCategory, vegOnly]);

  const handleQuantityChange = (item: FoodItem, quantity: number) => {
    const newItems = new Map(selectedItems);
    
    if (quantity <= 0) {
      newItems.delete(item.id);
    } else {
      newItems.set(item.id, { item, quantity });
    }
    
    onItemsChange(newItems);
  };

  const totalItems = Array.from(selectedItems.values()).reduce((sum, { quantity }) => sum + quantity, 0);
  const totalAmount = Array.from(selectedItems.values()).reduce(
    (sum, { item, quantity }) => sum + (getCustomerPrice(item) * quantity), 
    0
  );

  const isLoading = itemsLoading || categoriesLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Select Dishes (Optional)
          </span>
          {totalItems > 0 && (
            <Badge variant="secondary" className="bg-indoor-events/10 text-indoor-events">
              {totalItems} items • ₹{totalAmount.toLocaleString()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dishes..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={vegOnly ? "default" : "outline"}
              size="sm"
              className={vegOnly ? "bg-success hover:bg-success/90" : ""}
              onClick={() => setVegOnly(!vegOnly)}
            >
              <Leaf className="h-3 w-3 mr-1" />
              Veg Only
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        {!isLoading && categories && categories.length > 0 && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                className={selectedCategory === null ? "bg-indoor-events hover:bg-indoor-events/90" : ""}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className={selectedCategory === category.id ? "bg-indoor-events hover:bg-indoor-events/90" : ""}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* Items List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <Skeleton className="h-20 w-20 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBasket className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {items?.length === 0 
                  ? "No dishes available for indoor events yet" 
                  : "No dishes match your filters"}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <FoodItemCard
                key={item.id}
                item={item}
                quantity={selectedItems.get(item.id)?.quantity || 0}
                onQuantityChange={(quantity) => handleQuantityChange(item, quantity)}
                guestCount={guestCount}
              />
            ))
          )}
        </div>

        {/* Selected Items Summary */}
        {totalItems > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Selected Items</span>
              <span className="font-medium">{totalItems} items</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Estimated Total</span>
              <span className="font-semibold text-indoor-events">₹{totalAmount.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              * Final price may vary based on guest count and customizations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickBookingFoodSelection;
