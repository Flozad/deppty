import React, { useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Trash2, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import type { Listing } from '@/types/listing';

interface PropertyCardProps {
  listing: Listing;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

export function PropertyCard({ listing, onDelete, canEdit = false }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatPrice = (price: number | null | undefined) => {
    if (!price || isNaN(price)) return "0";
    return price.toLocaleString();
  };

  return (
    <div className="bg-[#2C2C2C] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      {/* Image Section */}
      <div className="relative h-48 group">
        {listing.listing_images && listing.listing_images.length > 0 ? (
          <>
            <div className="relative w-full h-full">
              <Image
                src={listing.listing_images[currentImageIndex]?.url}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={currentImageIndex === 0}
              />
            </div>
            
            {/* Navigation Arrows */}
            {listing.listing_images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(prev => 
                      prev === 0 ? listing.listing_images.length - 1 : prev - 1
                    );
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(prev => 
                      prev === listing.listing_images.length - 1 ? 0 : prev + 1
                    );
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-[#3C3C3C] flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Actions Overlay */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/50 p-1.5 rounded-full hover:bg-black/75 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-white" />
          </a>
          {canEdit && onDelete && (
            <button
              onClick={() => onDelete(listing.id)}
              className="bg-red-500/75 p-1.5 rounded-full hover:bg-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="text-lg font-semibold">
            USD {formatPrice(listing.amount)}
          </div>
          <span className="text-sm px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
            {listing.operation_type}
          </span>
        </div>

        <p className="text-sm text-gray-400 mb-2">{listing.title}</p>
        <p className="text-xs text-gray-500 truncate">{listing.address}</p>

        <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center text-sm">
          <div className="text-gray-400">
            {listing.total_area && `${listing.total_area}m² • `}
            {listing.rooms && `${listing.rooms} amb.`}
          </div>
          <div className="text-gray-400">
            {new Date(listing.created_date).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
} 