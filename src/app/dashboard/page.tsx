'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import { PropertyCard } from '@/components/PropertyCard';
import type { Listing } from '@/types/listing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

interface WhatsAppStatus {
  status: 'unconfigured' | 'connected' | 'pending';
  phone?: string;
}

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [isCheckingWhatsApp, setIsCheckingWhatsApp] = useState(false);
  const [whatsAppInfo, setWhatsAppInfo] = useState<WhatsAppStatus>({ 
    status: 'unconfigured' 
  });
  
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

  // Update the checkWhatsAppStatus function
  const checkWhatsAppStatus = useCallback(async () => {
    setIsCheckingWhatsApp(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentData, error } = await supabase
        .from('agents')
        .select('phone, whatsapp_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (!agentData?.phone) {
        setWhatsAppInfo({ status: 'unconfigured' });
        setShowWhatsAppDialog(true);
      } else {
        setWhatsAppInfo({ 
          status: agentData.whatsapp_status || 'pending',
          phone: agentData.phone 
        });
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
    } finally {
      setIsCheckingWhatsApp(false);
    }
  }, [supabase, setIsCheckingWhatsApp, setWhatsAppInfo, setShowWhatsAppDialog]);

  // Add this to your existing useEffect or create a new one
  useEffect(() => {
    checkWhatsAppStatus();
  }, [checkWhatsAppStatus]);

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

        {/* WhatsApp Status Section */}
        <div className="bg-[#1C1C1C] rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                whatsAppInfo.status === 'connected' 
                  ? 'bg-green-600/20' 
                  : whatsAppInfo.status === 'pending'
                  ? 'bg-yellow-600/20'
                  : 'bg-gray-600/20'
              }`}>
                <svg
                  className={`w-6 h-6 ${
                    whatsAppInfo.status === 'connected'
                      ? 'text-green-500'
                      : whatsAppInfo.status === 'pending'
                      ? 'text-yellow-500'
                      : 'text-gray-500'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">WhatsApp Integration</h3>
                <div className="text-gray-400">
                  {whatsAppInfo.status === 'connected' ? (
                    <>
                      <p>Connected and ready to use</p>
                      <p className="text-sm mt-1">Number: {whatsAppInfo.phone}</p>
                    </>
                  ) : whatsAppInfo.status === 'pending' ? (
                    <>
                      <p>Verification in progress</p>
                      <p className="text-sm mt-1">Number: {whatsAppInfo.phone}</p>
                      <p className="text-xs mt-1 text-yellow-500">Our team is working on verifying your number</p>
                    </>
                  ) : (
                    <p>Connect your WhatsApp to start receiving messages</p>
                  )}
                </div>
              </div>
            </div>
            
            {whatsAppInfo.status === 'unconfigured' && (
              <button
                onClick={checkWhatsAppStatus}
                disabled={isCheckingWhatsApp}
                className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all duration-200 flex items-center gap-2"
              >
                {isCheckingWhatsApp ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Connect WhatsApp</span>
                )}
              </button>
            )}
          </div>
        </div>

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

        {/* WhatsApp Verification Dialog */}
        <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
          <DialogContent className="bg-gray-900 text-white border border-gray-800">
            <DialogHeader>
              <DialogTitle>WhatsApp Verification</DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m0 0v2m0-2h2m-2 0H10"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">WhatsApp Setup in Progress</h3>
                  <p className="text-gray-400">
                    Our team is working on adding your WhatsApp number to the system.
                  </p>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-300">
                <p>A member of our team will contact you shortly to verify and configure your WhatsApp integration.</p>
                <p className="mt-2">This usually takes less than 24 hours.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 