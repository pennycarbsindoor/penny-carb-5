import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Panchayat } from '@/types/database';

interface LocationContextType {
  panchayats: Panchayat[];
  selectedPanchayat: Panchayat | null;
  selectedWardNumber: number | null;
  setSelectedPanchayat: (panchayat: Panchayat | null) => void;
  setSelectedWardNumber: (wardNumber: number | null) => void;
  isLoading: boolean;
  getWardsForPanchayat: (panchayat: Panchayat) => number[];
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [panchayats, setPanchayats] = useState<Panchayat[]>([]);
  const [selectedPanchayat, setSelectedPanchayat] = useState<Panchayat | null>(null);
  const [selectedWardNumber, setSelectedWardNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPanchayats = async () => {
      try {
        const { data, error } = await supabase
          .from('panchayats')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        if (data) {
          setPanchayats(data as Panchayat[]);
        }
      } catch (error) {
        console.error('Error fetching panchayats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPanchayats();
  }, []);

  // Load saved selection from localStorage
  useEffect(() => {
    const savedPanchayatId = localStorage.getItem('selectedPanchayatId');
    const savedWardNumber = localStorage.getItem('selectedWardNumber');

    if (savedPanchayatId && panchayats.length > 0) {
      const panchayat = panchayats.find(p => p.id === savedPanchayatId);
      if (panchayat) {
        setSelectedPanchayat(panchayat);
      }
    }

    if (savedWardNumber) {
      setSelectedWardNumber(parseInt(savedWardNumber, 10));
    }
  }, [panchayats]);

  // Save selection to localStorage
  useEffect(() => {
    if (selectedPanchayat) {
      localStorage.setItem('selectedPanchayatId', selectedPanchayat.id);
    } else {
      localStorage.removeItem('selectedPanchayatId');
    }
  }, [selectedPanchayat]);

  useEffect(() => {
    if (selectedWardNumber !== null) {
      localStorage.setItem('selectedWardNumber', selectedWardNumber.toString());
    } else {
      localStorage.removeItem('selectedWardNumber');
    }
  }, [selectedWardNumber]);

  // Generate ward numbers 1 to ward_count for a panchayat
  const getWardsForPanchayat = (panchayat: Panchayat): number[] => {
    return Array.from({ length: panchayat.ward_count }, (_, i) => i + 1);
  };

  // Reset ward number when panchayat changes
  const handleSetSelectedPanchayat = (panchayat: Panchayat | null) => {
    setSelectedPanchayat(panchayat);
    // Reset ward if the new panchayat doesn't have the selected ward number
    if (panchayat && selectedWardNumber !== null && selectedWardNumber > panchayat.ward_count) {
      setSelectedWardNumber(null);
    }
  };

  return (
    <LocationContext.Provider
      value={{
        panchayats,
        selectedPanchayat,
        selectedWardNumber,
        setSelectedPanchayat: handleSetSelectedPanchayat,
        setSelectedWardNumber,
        isLoading,
        getWardsForPanchayat,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
