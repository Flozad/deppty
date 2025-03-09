'use client';

import { useState, useEffect } from 'react';
import { ConnectCalendar } from '@/components/ConnectCalendar';
import { PropertyCalendar } from '@/components/PropertyCalendar';
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="bg-[#1E293B] rounded-xl p-6 shadow-lg border border-gray-700">
        <h2 className="text-2xl font-semibold text-white mb-6">Calendar Management</h2>
        <ConnectCalendar />
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="bg-[#1E293B] rounded-xl p-8 border border-gray-700">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-white">Loading properties...</span>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-[#1E293B] rounded-xl p-8 text-center border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-3">No Properties Found</h3>
            <p className="text-gray-300 mb-6">
              Add properties in the dashboard to start managing their calendars.
            </p>
            <a 
              href="/dashboard" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
            >
              Go to Dashboard
            </a>
          </div>
        ) : (
          <div className="bg-[#1E293B] rounded-xl p-6 shadow-lg border border-gray-700">
            <div className="mb-6">
              <label className="block text-base font-medium text-white mb-2">
                Select Property
              </label>
              <select
                value={selectedPropertyId || ''}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full p-3 bg-[#0F172A] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="" disabled className="text-gray-400">Choose a property</option>
                {listings.map((listing) => (
                  <option key={listing.id} value={listing.id} className="text-white">
                    {listing.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedPropertyId && (
              <div className="mt-6">
                <PropertyCalendar propertyId={selectedPropertyId} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 