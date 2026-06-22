import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  totalQuantity: number;
  goodCondition: number;
  damagedCondition: number;
  isActive: boolean;
  serialNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  address: string;
  country: string;
  state: string;
  status: 'active' | 'inactive';
}

export interface Booking {
  id: string;
  clientId: string;
  bookingDate: string;
  status: 'booked' | 'picked_up' | 'returned';
  paymentStatus: 'pending' | 'partially_paid' | 'fully_paid';
  createdAt: string;
  organization_name?: string;
}

export interface BookingItem {
  id: string;
  bookingId: string;
  productId: string;
  quantityBooked: number;
  totalPickedUp: number;
  totalReturned: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  is_superuser?: boolean;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  issue_date: string;
  organization_name?: string;
}
