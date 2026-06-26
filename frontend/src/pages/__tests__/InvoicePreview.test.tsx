import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoicePreview } from '../InvoicePreview';
import { InvoiceService, OrganizationService } from '@/src/api';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock dependencies
vi.mock('@/src/api', () => ({
  InvoiceService: {
    get: vi.fn(),
  },
  OrganizationService: {
    get: vi.fn(),
  },
  AuthService: {
    getMe: vi.fn().mockResolvedValue({ data: { organization_id: 1 } }),
  }
}));

vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({
    showNotification: vi.fn(),
  })
}));

const mockInvoice = {
  invoice_id: 1,
  invoice_number: 'INV-001',
  client_name: 'John Doe',
  client_email: 'john@example.com',
  issue_date: '2023-10-01',
  due_date: '2023-10-15',
  status: 'issued',
  total_amount: '150.00',
  subtotal: '150.00',
  currency_symbol: '$',
  tax_percentage: '10',
  tax_amount: '15.00',
  discount_amount: '0',
  line_items: [
    {
      description: 'Test Item',
      details: 'Test details',
      quantity: 1,
      unit_price: '150.00',
      total: '150.00'
    }
  ]
};

const mockOrg = {
  name: 'Test Company',
  primary_color: '#000000',
  address: '123 Test St',
};

describe('InvoicePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (InvoiceService.get as any).mockImplementation(() => new Promise(() => {}));
    (OrganizationService.get as any).mockImplementation(() => new Promise(() => {}));
    
    render(
      <MemoryRouter initialEntries={['/invoices/1/preview']}>
        <Routes>
          <Route path="/invoices/:id/preview" element={<InvoicePreview />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders invoice and org details successfully', async () => {
    (InvoiceService.get as any).mockResolvedValue({ data: mockInvoice });
    (OrganizationService.get as any).mockResolvedValue({ data: mockOrg });

    render(
      <MemoryRouter initialEntries={['/invoices/1/preview']}>
        <Routes>
          <Route path="/invoices/:id/preview" element={<InvoicePreview />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getAllByText(/Test Item/i).length).toBeGreaterThan(0);
  });

  it('renders not found when invoice load fails', async () => {
    (InvoiceService.get as any).mockRejectedValue(new Error('Not found'));
    
    render(
      <MemoryRouter initialEntries={['/invoices/1/preview']}>
        <Routes>
          <Route path="/invoices/:id/preview" element={<InvoicePreview />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Invoice not found/i)).toBeInTheDocument();
    });
  });
});
