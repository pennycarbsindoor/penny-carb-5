import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Utensils, 
  Sparkles, 
  Users, 
  SprayCan, 
  CookingPot,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectedService } from '@/pages/IndoorEventsPlanner';

interface ServicesStepProps {
  selectedServices: SelectedService[];
  guestCount: number;
  onUpdateServices: (services: SelectedService[]) => void;
  onNext: () => void;
  onBack: () => void;
}

// Predefined services - in production, fetch from database
export const AVAILABLE_SERVICES: Omit<SelectedService, 'enabled'>[] = [
  {
    id: 'live-counter',
    name: 'Live Counter',
    price: 50,
    priceType: 'per_guest',
  },
  {
    id: 'decoration',
    name: 'Decoration',
    price: 5000,
    priceType: 'fixed',
  },
  {
    id: 'serving-staff',
    name: 'Serving Staff',
    price: 25,
    priceType: 'per_guest',
  },
  {
    id: 'cleaning',
    name: 'Cleaning Service',
    price: 2000,
    priceType: 'fixed',
  },
  {
    id: 'rental-vessels',
    name: 'Rental Vessels',
    price: 15,
    priceType: 'per_guest',
  },
  {
    id: 'dj-music',
    name: 'DJ / Music',
    price: 8000,
    priceType: 'fixed',
  },
];

const serviceIcons: Record<string, React.ReactNode> = {
  'live-counter': <Utensils className="h-5 w-5" />,
  'decoration': <Sparkles className="h-5 w-5" />,
  'serving-staff': <Users className="h-5 w-5" />,
  'cleaning': <SprayCan className="h-5 w-5" />,
  'rental-vessels': <CookingPot className="h-5 w-5" />,
  'dj-music': <Music className="h-5 w-5" />,
};

const ServicesStep: React.FC<ServicesStepProps> = ({
  selectedServices,
  guestCount,
  onUpdateServices,
  onNext,
  onBack,
}) => {
  // Initialize services if empty
  useEffect(() => {
    if (selectedServices.length === 0) {
      onUpdateServices(
        AVAILABLE_SERVICES.map((s) => ({ ...s, enabled: false }))
      );
    }
  }, [selectedServices.length, onUpdateServices]);

  const toggleService = (serviceId: string) => {
    onUpdateServices(
      selectedServices.map((s) =>
        s.id === serviceId ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const getServicePrice = (service: SelectedService) => {
    if (service.priceType === 'per_guest') {
      return service.price * guestCount;
    }
    return service.price;
  };

  const serviceTotal = selectedServices
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + getServicePrice(s), 0);

  const enabledCount = selectedServices.filter((s) => s.enabled).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Add Services</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enhance your event with additional services
        </p>
      </div>

      <div className="space-y-3">
        {selectedServices.map((service) => (
          <Card
            key={service.id}
            className={cn(
              "transition-all cursor-pointer",
              service.enabled && "border-indoor-events/50 bg-indoor-events/5"
            )}
            onClick={() => toggleService(service.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl transition-colors",
                  service.enabled 
                    ? "bg-indoor-events text-white" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {serviceIcons[service.id] || <Sparkles className="h-5 w-5" />}
                </div>

                <div className="flex-1">
                  <h4 className="font-medium">{service.name}</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-indoor-events font-semibold">
                      ₹{service.price.toLocaleString()}
                      {service.priceType === 'per_guest' && '/guest'}
                    </p>
                    {service.priceType === 'per_guest' && service.enabled && (
                      <Badge variant="secondary" className="text-xs">
                        ₹{getServicePrice(service).toLocaleString()} total
                      </Badge>
                    )}
                  </div>
                </div>

                <Switch
                  checked={service.enabled}
                  onCheckedChange={() => toggleService(service.id)}
                  className="data-[state=checked]:bg-indoor-events"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      {enabledCount > 0 && (
        <Card className="bg-indoor-events/5 border-indoor-events/30">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  {enabledCount} service{enabledCount > 1 ? 's' : ''} selected
                </p>
                <p className="text-lg font-bold text-indoor-events">
                  ₹{serviceTotal.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                For {guestCount} guests
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          className="flex-1 bg-indoor-events hover:bg-indoor-events/90"
          onClick={onNext}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default ServicesStep;
