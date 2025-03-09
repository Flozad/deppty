'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import { PropertyCard } from '@/components/PropertyCard';
import type { Listing } from '@/types/listing';

interface MediaItem {
  IdTipoMultimedia: number;
  Large?: string;
  Url: string;
  Orden: number;
}

interface PropertyData {
  IdAviso: number;
  Titulo_t: string;
  TipoOperacion_t: string;
  MontoOperacion_i: number;
  MonedaSimbolo_t: string;
  Expensas_i?: number;
  MonedaSimboloExpensas_t?: string;
  InformacionAdicional_t: string;
  Direccion_NombreCalle_t?: string;
  Direccion_Numero_i?: number;
  Direccion_Latitud_d?: number;
  Direccion_Longitud_d?: number;
  Visible_b: boolean;
  TipoPropiedad_t: string;
  DescripcionSeo_t: string;
  TelefonoContacto_t?: string;
  FechaPublicacionAviso_dt?: string;
  FechaModificacionAviso_dt?: string;
  SuperficieCubierta_d?: number;
  SuperficieTotal_d?: number;
  SuperficieDesCubierta_d?: number;
  CantidadAmbientes_i?: number;
  CantidadDormitorios_i?: number;
  CantidadBanos_i?: number;
  CantidadCocheras_i?: number;
  Piso_t?: string;
  Departamento_t?: string;
  Barrio_t?: string;
  Partido_t?: string;
  Provincia_t?: string;
  Pais_t?: string;
  Multimedia_s: MediaItem[];
}

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  
  const supabase = createClientComponentClient();

  // Add authentication check and fetch listings
  useEffect(() => {
    const checkUserAndFetchListings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirect('/login');
        return;
      }

      // Fetch user's listings
      const { data: userListings, error: listingsError } = await supabase
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

      if (listingsError) {
        console.error('Error fetching listings:', listingsError);
        return;
      }

      setListings(userListings || []);
      setLoadingListings(false);
    };

    checkUserAndFetchListings();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Get the user's ID and verify authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirect('/login');
        return;
      }

      // First, try to create the agent
      const { error: createError } = await supabase
        .from('agents')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          phone: user.user_metadata?.phone || '',
          specialization: user.user_metadata?.specialization || null,
          active: true
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (createError) {
        console.error('Agent creation error:', createError);
        throw new Error('Failed to create or update agent profile');
      }

      // Verify the agent was created/exists
      const { data: agentCheck, error: agentCheckError } = await supabase
        .from('agents')
        .select('id')
        .eq('id', user.id)
        .single();

      if (agentCheckError || !agentCheck) {
        console.error('Agent verification error:', agentCheckError);
        throw new Error('Failed to verify agent profile');
      }

      // Extract property ID from URL
      const propertyId = url.match(/--(\d+)$/)?.[1];
      if (!propertyId) {
        throw new Error('Invalid Argenprop URL format');
      }

      // Check if posting already exists
      const { data: existingPosting, error: existingCheckError } = await supabase
        .from('postings')
        .select('id')
        .eq('posting_id_old', propertyId)
        .single();

      if (existingCheckError && existingCheckError.code !== 'PGRST116') {
        throw existingCheckError;
      }

      if (existingPosting) {
        throw new Error('This property has already been imported');
      }

      // Fetch property data
      const response = await fetch(`https://api.sosiva451.com/Avisos/${propertyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch property data');
      }

      const data: PropertyData = await response.json();

      // Create new posting
      const { data: postingData, error: dbError } = await supabase
        .from('postings')
        .insert({
          posting_id_old: propertyId,
          title: data.Titulo_t,
          operation_type: data.TipoOperacion_t,
          amount: data.MontoOperacion_i,
          amount_currency: data.MonedaSimbolo_t,
          expensas: data.Expensas_i,
          expensas_currency: data.MonedaSimboloExpensas_t,
          description: data.InformacionAdicional_t,
          address: `${data.Direccion_NombreCalle_t || ''} ${data.Direccion_Numero_i || ''}`.trim() || null,
          latitude: data.Direccion_Latitud_d,
          longitude: data.Direccion_Longitud_d,
          status: data.Visible_b ? 'ACTIVE' : 'INACTIVE',
          realestate_type_name: data.TipoPropiedad_t,
          url: `https://www.argenprop.com/${data.DescripcionSeo_t}`,
          whatsapp: data.TelefonoContacto_t,
          created_date: data.FechaPublicacionAviso_dt,
          modified_date: data.FechaModificacionAviso_dt,
          covered_area: data.SuperficieCubierta_d,
          total_area: data.SuperficieTotal_d,
          uncovered_area: data.SuperficieDesCubierta_d,
          rooms: data.CantidadAmbientes_i,
          bedrooms: data.CantidadDormitorios_i,
          bathrooms: data.CantidadBanos_i,
          garages: data.CantidadCocheras_i,
          floor: data.Piso_t,
          unit: data.Departamento_t,
          neighborhood: data.Barrio_t,
          city: data.Partido_t,
          state: data.Provincia_t,
          country: data.Pais_t,
          has_video: data.Multimedia_s.some(m => m.IdTipoMultimedia === 2),
          has_tour: data.Multimedia_s.some(m => m.IdTipoMultimedia === 3),
          has_plans: data.Multimedia_s.some(m => m.IdTipoMultimedia === 4),
          reserved: !data.Visible_b,
          source: 'argenprop',
          publisher_id: user.id,
          secondary_url: `https://www.argenprop.com/${data.DescripcionSeo_t.split('--')[1] || data.DescripcionSeo_t}--${data.IdAviso}`
        })
        .select()
        .single();

      if (dbError) {
        console.error('Posting creation error:', dbError);
        throw new Error('Failed to create posting');
      }

      // Process images
      if (postingData && data.Multimedia_s.length > 0) {
        const images = data.Multimedia_s
          .filter(media => media.IdTipoMultimedia === 1)
          .map((media, index) => ({
            listing_id: postingData.id,
            url: media.Large || media.Url,
            order_index: media.Orden || index,
            width: null,
            height: null,
            title: ''
          }));

        const { error: imagesError } = await supabase
          .from('listing_images')
          .insert(images);

        if (imagesError) throw imagesError;
      }

      setSuccess(true);
    } catch (error: unknown) {
      console.error('Full error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('postings')
        .delete()
        .eq('id', listingId);

      if (deleteError) throw deleteError;

      // Update listings state to remove the deleted listing
      setListings(listings.filter(listing => listing.id !== listingId));
    } catch (error) {
      console.error('Error deleting listing:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

        {/* Add Property Form */}
        <div className="bg-[#1C1C1C] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Property</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                Argenprop URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.argenprop.com/..."
                className="w-full p-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium 
                ${loading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-700 active:bg-blue-800'} 
                transition-all duration-200`}
            >
              {loading ? 'Processing...' : 'Add Property'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 p-4 bg-green-900/50 border border-green-500 text-green-200 rounded-lg">
                Property added successfully!
              </div>
            )}
          </form>
        </div>

        {/* Listings Grid */}
        <div className="bg-[#1C1C1C] rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Properties</h2>
          
          {loadingListings ? (
            <div className="text-center py-8">Loading...</div>
          ) : listings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No properties found. Add your first property using the form above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <PropertyCard
                  key={listing.id}
                  listing={listing}
                  onDelete={() => handleDelete(listing.id)}
                  canEdit={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 