export interface ListingImage {
  id: string;
  url: string;
  order_index: number;
  width?: number | null;
  height?: number | null;
  title?: string;
}

export interface Listing {
  id: string;
  title: string;
  operation_type: string;
  amount: number;
  amount_currency: string;
  address: string | null;
  url: string;
  total_area?: number | null;
  covered_area?: number | null;
  rooms?: number | null;
  created_date: string;
  listing_images: ListingImage[];
} 