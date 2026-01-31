import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import type { FoodItemWithImages } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ArrowLeft, Plus, Minus, Clock, Leaf, ShoppingCart, CalendarHeart } from 'lucide-react';

const ItemDetail: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { addToCart, items: cartItems, updateQuantity } = useCart();
  
  const [item, setItem] = useState<FoodItemWithImages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const cartItem = cartItems.find(ci => ci.food_item_id === itemId);
  const currentCartQuantity = cartItem?.quantity || 0;

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId) return;
      
      try {
        const { data, error } = await supabase
          .from('food_items')
          .select(`
            *,
            images:food_item_images(*),
            category:food_categories(*)
          `)
          .eq('id', itemId)
          .single();

        if (error) throw error;
        setItem(data as FoodItemWithImages);
      } catch (error) {
        console.error('Error fetching item:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [itemId]);

  const handleAddToCart = async () => {
    if (!item) return;
    await addToCart(item.id, quantity);
    navigate(-1);
  };

  const handleUpdateCart = async (newQuantity: number) => {
    if (!cartItem) return;
    await updateQuantity(cartItem.id, newQuantity);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-72 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <span className="text-6xl">😕</span>
        <h2 className="mt-4 text-lg font-semibold">Item not found</h2>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const images = item.images?.sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.display_order - b.display_order;
  }) || [];

  const isIndoorEvents = item.service_type === 'indoor_events';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-50 p-4">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-card/90 shadow-md backdrop-blur"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      {/* Image Carousel */}
      <div className="relative bg-secondary">
        {images.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent>
              {images.map((image) => (
                <CarouselItem key={image.id}>
                  <div className="h-72 w-full sm:h-96">
                    <img
                      src={image.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {images.length > 1 && (
              <>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="flex h-72 items-center justify-center text-7xl sm:h-96">
            🍽️
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-2xl font-bold">{item.name}</h1>
          {item.is_vegetarian && (
            <Badge className="gap-1 bg-success shrink-0">
              <Leaf className="h-3 w-3" />
              Veg
            </Badge>
          )}
        </div>

        {item.category && (
          <Badge variant="secondary" className="mt-2">
            {item.category.name}
          </Badge>
        )}

        {item.preparation_time_minutes && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{item.preparation_time_minutes} min preparation time</span>
          </div>
        )}

        {item.description && (
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="mt-6">
          <span className="text-3xl font-bold text-foreground">
            ₹{item.price.toFixed(0)}
          </span>
          {isIndoorEvents && (
            <span className="ml-2 text-sm text-muted-foreground">per plate</span>
          )}
        </div>

        {/* Indoor Events Notice */}
        {isIndoorEvents && (
          <div className="mt-4 rounded-lg border border-indoor-events/30 bg-indoor-events/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-indoor-events">🎉 Event Item:</strong> This dish is available for indoor events and party bookings. 
              Contact us to customize your menu and get a quotation.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4 shadow-lg">
        {isIndoorEvents ? (
          // Indoor Events - Show Book Event button (no cart)
          <Button 
            className="w-full h-12 text-base bg-indoor-events hover:bg-indoor-events/90" 
            onClick={() => navigate('/book-event')}
          >
            <CalendarHeart className="mr-2 h-5 w-5" />
            Book Event with This Dish
          </Button>
        ) : currentCartQuantity > 0 ? (
          // Already in cart - show update controls
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Already in cart
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-r-none"
                  onClick={() => handleUpdateCart(currentCartQuantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center font-semibold">
                  {currentCartQuantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-l-none"
                  onClick={() => handleUpdateCart(currentCartQuantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => navigate('/cart')}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                View Cart
              </Button>
            </div>
          </div>
        ) : (
          // Not in cart - show add to cart
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-r-none"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-lg font-semibold">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-l-none"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button className="flex-1 h-12 text-base" onClick={handleAddToCart}>
              Add to Cart - ₹{(item.price * quantity).toFixed(0)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetail;
