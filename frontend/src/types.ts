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

export interface Vendor {
  id: string;
  business_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  service: string;
  description?: string;
  status: 'active' | 'inactive';
}

export interface EventProject {
  event_id: number;
  name: string;
  description?: string;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  invoice?: number | null;
  invoice_number?: string;
  client_details?: {
    client_id: number;
    business_name: string;
    email?: string;
    phone_number?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  } | null;
  revenue: number;
  total_expenses: number;
  profit: number;
}

export interface ExpenseLineItem {
  expense_id: number;
  event: number;
  expense_type: 'vendor' | 'item';
  vendor?: number | null;
  name: string;
  amount: number;
  description?: string;
}

export interface ChecklistTask {
  task_id: number;
  event: number;
  checklist_type: 'pre_event' | 'during_event' | 'post_event';
  parent_task?: number | null;
  name: string;
  description?: string;
  due_date?: string;
  is_done: boolean;
  position: number;
  subtasks?: ChecklistTask[];
}

export interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  issue_date: string;
  organization_name?: string;
}

export interface FeedbackQuestion {
  id?: number;
  question_text: string;
  question_type: 'TEXT' | 'RATING' | 'BOOLEAN';
  position: number;
}

export interface FeedbackForm {
  id: number;
  title: string;
  description?: string;
  questions?: FeedbackQuestion[];
  created_at?: string;
  updated_at?: string;
}

export interface ProjectFeedback {
  id: number;
  event_id: number;
  form: FeedbackForm;
  public_id: string;
  is_active: boolean;
  created_at: string;
}

export interface FeedbackAnswer {
  question: number;
  answer_text?: string;
  answer_rating?: number;
  answer_boolean?: boolean;
}

export interface FeedbackResponse {
  id?: number;
  project_feedback: number;
  client_name?: string;
  client_email?: string;
  submitted_at?: string;
  answers: FeedbackAnswer[];
}
