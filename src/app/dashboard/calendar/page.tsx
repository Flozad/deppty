'use client';

import { useState, useEffect } from 'react';
import { MultiPropertyCalendar } from '@/components/MultiPropertyCalendar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Listing } from '@/types/listing';

export default function CalendarPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userListings, error } = await supabase
          .from('postings')
          .select(`
            *,
            listing_images (
              id,
              url,
              order_index
            )
          `)
          .eq('publisher_id', user.id)
          .order('created_date', { ascending: false });

        if (error) throw error;
        setListings(userListings || []);
        
        if (userListings && userListings.length > 0) {
          setSelectedPropertyId(userListings[0].id);
        }
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [supabase]);

  // Convert listings to the format expected by MultiPropertyCalendar
  const propertyColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-red-500',
    'bg-indigo-500',
  ];

  const formattedProperties = listings.map((listing, index) => ({
    id: listing.id,
    title: listing.title,
    color: propertyColors[index % propertyColors.length]
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-6">
        {isLoading ? (
          <div className="bg-[#1E293B] rounded-xl p-8 border border-gray-700">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-white">Cargando propiedades...</span>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-[#1E293B] rounded-xl p-8 text-center border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-3">No se encontraron propiedades</h3>
            <p className="text-gray-300 mb-6">
              Agrega propiedades en el panel de control para empezar a gestionar sus calendarios.
            </p>
            <a 
              href="/dashboard" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
            >
              Ir al Panel de Control
            </a>
          </div>
        ) : (
          <div className="bg-[#1E293B] rounded-xl p-6 shadow-lg border border-gray-700">
            <div className="mt-6">
              <MultiPropertyCalendar 
                properties={formattedProperties}
                selectedPropertyId={selectedPropertyId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 