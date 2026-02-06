import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Utensils,
  Sparkles,
  Users,
  SprayCan,
  CookingPot,
  Music,
  Check,
  X,
} from 'lucide-react';
import type { SelectedService } from '@/pages/IndoorEventsPlanner';

interface ServiceOptionDialogProps {
  open: boolean;
  service: SelectedService | null;
  guestCount: number;
  currentIndex: number;
  totalCount: number;
  onAccept: () => void;
  onSkip: () => void;
}

const serviceIcons: Record<string, React.ReactNode> = {
  'live-counter': <Utensils className="h-8 w-8" />,
  'decoration': <Sparkles className="h-8 w-8" />,
  'serving-staff': <Users className="h-8 w-8" />,
  'cleaning': <SprayCan className="h-8 w-8" />,
  'rental-vessels': <CookingPot className="h-8 w-8" />,
  'dj-music': <Music className="h-8 w-8" />,
};

const ServiceOptionDialog: React.FC<ServiceOptionDialogProps> = ({
  open,
  service,
  guestCount,
  currentIndex,
  totalCount,
  onAccept,
  onSkip,
}) => {
  if (!service) return null;

  const totalPrice =
    service.priceType === 'per_guest'
      ? service.price * guestCount
      : service.price;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onSkip()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-sm text-muted-foreground font-normal">
            Service {currentIndex + 1} of {totalCount}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Icon & Name */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="p-4 rounded-2xl bg-indoor-events/10 text-indoor-events">
              {serviceIcons[service.id] || <Sparkles className="h-8 w-8" />}
            </div>
            <div>
              <h3 className="text-xl font-bold">{service.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Do you want to add this service?
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-muted rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">
                ₹{service.price.toLocaleString()}
                {service.priceType === 'per_guest' && (
                  <span className="text-muted-foreground">/guest</span>
                )}
              </span>
            </div>

            {service.priceType === 'per_guest' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  For {guestCount} guests
                </span>
                <Badge variant="secondary">
                  ₹{totalPrice.toLocaleString()} total
                </Badge>
              </div>
            )}

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between font-semibold">
              <span>Estimated Cost</span>
              <span className="text-indoor-events text-lg">
                ₹{totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onSkip}
            >
              <X className="h-4 w-4 mr-2" />
              Skip
            </Button>
            <Button
              className="flex-1 bg-indoor-events hover:bg-indoor-events/90"
              onClick={onAccept}
            >
              <Check className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceOptionDialog;
