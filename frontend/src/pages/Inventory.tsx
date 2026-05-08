import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Package, 
  Tag, 
  AlertTriangle, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  TrendingUp,
  X
} from 'lucide-react';
import { cn } from '@/src/utils';
import { ProductService, CategoryService } from '../api';

export function Inventory() {
  const { showNotification, showConfirm } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const currencySymbol = localStorage.getItem('currencySymbol') || '$';
  const [units, setUnits] = useState([
    { name: '', serial_number: '', status: 'available', unit_type: 'single', quantity: 1, unit_cost_price: '0.00', cost_price: '0.00', rental_price: '0.00', unit: 'per_day' }
  ]);
  const [products, setProducts] = useState<any[]>([]);
  
  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount));
  };
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newCategoryIsActive, setNewCategoryIsActive] = useState(true);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [drillDownProduct, setDrillDownProduct] = useState<any | null>(null);
  const [drillDownType, setDrillDownType] = useState<'total' | 'good' | 'available' | 'damaged'>('total');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<number[]>([]);

  const toggleProductExpand = (id: number) => {
    setExpandedProductIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [newProduct, setNewProduct] = useState({
    name: '',
    category_id: '',
    is_active: true,
  });

  React.useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [searchTerm]);

  const fetchCategories = async () => {
    try {
      const response = await CategoryService.getAll();
      setCategories(response.data.results || response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditProductClick = (product: any) => {
    setEditingProductId(product.product_id);
    setNewProduct({
      name: product.name,
      category_id: product.category.toString(),
      is_active: product.is_active,
    });
    setUnits(product.units && product.units.length > 0 
      ? product.units.map((u: any) => ({
          product_unit_id: u.product_unit_id,
          name: u.name || '',
          serial_number: u.serial_number || '',
          status: u.status,
          unit_type: u.unit_type || 'single',
          quantity: u.quantity || 1,
          unit_cost_price: u.unit_cost_price?.toString() || '0.00',
          cost_price: u.cost_price.toString(),
          rental_price: u.rental_price.toString(),
          unit: u.unit || 'per_day',
          // read-only breakdown fields
          quantity_available: u.quantity_available ?? 0,
          quantity_rented: u.quantity_rented ?? 0,
          quantity_good: u.quantity_good ?? 0,
          quantity_damaged: u.quantity_damaged ?? 0,
        }))
      : [{ name: '', serial_number: '', status: 'available', unit_type: 'single', quantity: 1, unit_cost_price: '0.00', cost_price: '0.00', rental_price: '0.00', unit: 'per_day' }]
    );
    setShowAddModal(true);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.category_id) {
      showNotification("Please fill in all required product fields.", 'warning');
      return;
    }
    if (units.length === 0 || (units[0].unit_type === 'single' && !units[0].serial_number?.trim())) {
      showNotification("At least one product unit is required (with serial number for single items).", 'warning');
      return;
    }

    try {
      setIsLoading(true);
      const productData = {
        name: newProduct.name,
        category: parseInt(newProduct.category_id),
        is_active: newProduct.is_active,
        units: units.map(u => ({
          ...(u as any).product_unit_id ? { product_unit_id: (u as any).product_unit_id } : {},
          name: u.name || null,
          serial_number: u.unit_type === 'single' ? u.serial_number : null,
          unit_type: u.unit_type,
          quantity: parseInt(u.quantity as any) || 1,
          unit_cost_price: parseFloat(u.unit_cost_price || '0'),
          status: u.status || 'available',
          rental_price: parseFloat(u.rental_price || '0'),
          unit: u.unit || 'per_day',
          quantity_damaged: (u as any).quantity_damaged ?? 0,
        }))
      };

      if (editingProductId) {
        await ProductService.update(editingProductId, productData);
        showNotification("Product updated successfully!", 'success');
      } else {
        await ProductService.create(productData);
        showNotification("Product created successfully!", 'success');
      }
      
      setShowAddModal(false);
      setEditingProductId(null);
      setNewProduct({ name: '', category_id: '', is_active: true });
      setUnits([{ name: '', serial_number: '', status: 'available', unit_type: 'single', quantity: 1, unit_cost_price: '0.00', cost_price: '0.00', rental_price: '0.00', unit: 'per_day' }]);
      fetchProducts();
    } catch (e: any) {
      console.error(e);
      showNotification(e.response?.data?.error || "Failed to save product.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    showConfirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await ProductService.delete(id);
          showNotification('Product deleted successfully', 'success');
          fetchProducts();
        } catch (e) {
          console.error(e);
          showNotification('Failed to delete product.', 'error');
        }
      }
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showNotification("Category name is required.", 'warning');
      return;
    }
    try {
      setSavingCategory(true);
      if (editCategoryId) {
        await CategoryService.update(editCategoryId, { name: newCategoryName, description: newCategoryDesc, is_active: newCategoryIsActive });
        showNotification("Category updated!", 'success');
      } else {
        await CategoryService.create({ name: newCategoryName, description: newCategoryDesc, is_active: newCategoryIsActive });
        showNotification("Category added!", 'success');
      }
      setNewCategoryName('');
      setNewCategoryDesc('');
      setNewCategoryIsActive(true);
      setEditCategoryId(null);
      fetchCategories();
    } catch (error: any) {
      console.error(error);
      showNotification(error.response?.data?.error || 'Failed to save category', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleEditCategoryClick = (c: any) => {
    setEditCategoryId(c.id || c.category_id);
    setNewCategoryName(c.name);
    setNewCategoryDesc(c.description || '');
    setNewCategoryIsActive(c.is_active);
  };

  const handleDeleteCategory = async (id: number) => {
    showConfirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This will fail if products are still assigned to it.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await CategoryService.delete(id);
          showNotification('Category deleted successfully', 'success');
          fetchCategories();
        } catch (error: any) {
          console.error(error);
          showNotification(error.response?.data?.error || 'Failed to delete category. It may be in use.', 'error');
        }
      }
    });
  };
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      // Backend expects 'search' parameter for SearchFilter
      const response = await ProductService.getAll({ search: searchTerm });
      // DRF ModelViewSet returns { count, next, previous, results: [...] } when paginated
      setProducts(response.data.results || response.data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Inventory Management</h1>
          <p className="text-[var(--text-muted)]">Manage your products, categories, and stock levels.</p>
        </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2 border border-[var(--border-soft)] text-[var(--text-main)] bg-[var(--bg-surface)] rounded-xl font-medium hover:bg-[var(--bg-app)] transition-colors shadow-sm"
            >
              Categories
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-brand-primary text-brand-accent px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-sm shadow-brand-primary/20"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2 mt-4">
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Total Products</p>
            <p className="text-2xl font-bold text-[var(--text-main)]">{products.length}</p>
          </div>
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary"><Package size={24}/></div>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Value of Displayed Stock (Cost)</p>
            <p className="text-2xl font-bold text-[var(--text-main)]">{currencySymbol}{formatCurrency(products.reduce((acc, p) => acc + (parseFloat(p.total_cost_price) || 0), 0))}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><TrendingUp size={24}/></div>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Items Needing Repair</p>
            <p className="text-2xl font-bold text-rose-500">{products.reduce((acc, p) => acc + (p.total_quantity_damaged_condition || 0), 0)}</p>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500"><AlertTriangle size={24}/></div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-soft)] shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search products, serial numbers..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all text-[var(--text-main)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-app)] font-medium transition-colors">
            <Filter className="w-4 h-4" />
            Category
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-app)] font-medium transition-colors">
            Status
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-app)] border-b border-[var(--border-soft)]">
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Product</th>
                <th className="hidden lg:table-cell px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Category</th>
                <th className="px-2 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center">Cost</th>
                <th className="px-2 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center">Qty</th>
                <th className="hidden sm:table-cell px-6 py-4 text-xs font-semibold text-emerald-500 uppercase tracking-wider text-center">Good</th>
                <th className="px-2 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-blue-500 uppercase tracking-wider text-center">Avail</th>
                <th className="hidden sm:table-cell px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center">Rented</th>
                <th className="hidden sm:table-cell px-6 py-4 text-xs font-semibold text-rose-500 uppercase tracking-wider text-center">Dmg</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[var(--text-muted)]">
                    Loading inventory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[var(--text-muted)]">
                    No products found.
                  </td>
                </tr>
              ) : products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((product) => (
                <React.Fragment key={product.product_id}>
                  <tr className="hover:bg-[var(--bg-app)] transition-colors group cursor-pointer" onClick={() => toggleProductExpand(product.product_id)}>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={cn(
                          "transition-transform duration-200",
                          expandedProductIds.includes(product.product_id) ? "rotate-90" : ""
                        )}>
                          <ChevronRight className="w-3.5 h-3.5 sm:w-4 h-4 text-[var(--text-muted)]" />
                        </div>
                        <div className="hidden sm:flex w-8 h-8 bg-[var(--bg-app)] rounded-lg items-center justify-center text-[var(--text-muted)] shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-[var(--text-main)] truncate">{product.name}</p>
                          <p className="text-[9px] sm:text-[10px] text-[var(--text-muted)] uppercase tracking-wider truncate">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        <Tag className="w-3 h-3" />
                        {product.category_name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-2 sm:px-6 py-4 text-center text-xs sm:text-sm text-[var(--text-muted)] font-medium">
                      {currencySymbol}{formatCurrency(product.total_cost_price)}
                    </td>
                    <td className="px-2 sm:px-6 py-4 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDrillDownProduct(product); setDrillDownType('total'); setShowDrillDown(true); }}
                        className="text-xs sm:text-sm font-bold text-[var(--text-muted)] hover:text-brand-primary hover:underline transition-all"
                      >
                        {product.total_quantity || 0}
                      </button>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDrillDownProduct(product); setDrillDownType('good'); setShowDrillDown(true); }}
                        className="text-xs sm:text-sm font-bold text-emerald-600 hover:underline transition-all"
                      >
                        {product.total_quantity_good_condition || 0}
                      </button>
                    </td>
                    <td className="px-2 sm:px-6 py-4 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDrillDownProduct(product); setDrillDownType('available'); setShowDrillDown(true); }}
                        className="text-xs sm:text-sm font-bold text-blue-600 hover:underline transition-all"
                      >
                        {product.total_quantity_good_condition_available || 0}
                      </button>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDrillDownProduct(product); setDrillDownType('rented'); setShowDrillDown(true); }}
                        className="text-xs sm:text-sm font-bold text-[var(--text-muted)] hover:underline transition-all"
                      >
                        {Math.max(0, (product.total_quantity_good_condition || 0) - (product.total_quantity_good_condition_available || 0))}
                      </button>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDrillDownProduct(product); setDrillDownType('damaged'); setShowDrillDown(true); }}
                        className="text-xs sm:text-sm font-bold text-rose-600 hover:underline transition-all"
                      >
                        {product.total_quantity_damaged_condition || 0}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditProductClick(product); }}
                          className="p-2 text-[var(--text-muted)] hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.product_id); }}
                          className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Sub-table for Units */}
                  {expandedProductIds.includes(product.product_id) && (
                    <tr className="bg-[var(--bg-app)]/50">
                      <td colSpan={9} className="px-12 py-4">
                        <div className="border border-[var(--border-soft)] rounded-xl bg-[var(--bg-surface)] overflow-x-auto shadow-sm">
                          <table className="w-full text-left min-w-[500px]">
                            <thead className="bg-[var(--bg-app)] border-b border-[var(--border-soft)]">
                              <tr>
                                <th className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Unit Name</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Type</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Qty</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Unit Cost</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Total Cost</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Rental Rate</th>
                                 <th className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Availability</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                              {product.units?.map((unit: any) => (
                                <tr key={unit.product_unit_id} className="hover:bg-[var(--bg-app)] transition-colors">
                                  <td className="px-4 py-2 text-xs font-semibold text-[var(--text-main)]">{unit.name || '-'}</td>
                                  <td className="px-4 py-2 text-xs text-center">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                      unit.unit_type === 'bulk' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                                    )}>
                                      {unit.unit_type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-xs text-center text-[var(--text-muted)] font-bold">{unit.unit_type === 'bulk' ? unit.quantity : 1}</td>
                                  <td className="px-4 py-2 text-xs text-center text-[var(--text-muted)]">{currencySymbol}{formatCurrency(unit.unit_cost_price)}</td>
                                  <td className="px-4 py-2 text-xs text-center text-[var(--text-muted)] font-bold">{currencySymbol}{formatCurrency(unit.cost_price)}</td>
                                  <td className="px-4 py-2 text-xs text-center font-bold text-brand-primary">
                                    {currencySymbol}{formatCurrency(unit.rental_price)} 
                                    <span className="text-[10px] font-normal text-[var(--text-muted)] ml-1">
                                      {unit.unit?.replace('_', ' ')}
                                    </span>
                                  </td>
                                   <td className="px-4 py-2 text-xs">
                                     <div className="flex flex-col gap-1.5">
                                       {/* Status badge */}
                                       <span className={cn(
                                         "px-2 py-0.5 rounded-full font-bold border text-[10px] w-fit uppercase",
                                         unit.status === 'available' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                         unit.status === 'rented'    ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                         unit.status === 'damaged'   ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                         "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                                       )}>
                                         {unit.status}
                                       </span>
                                       {/* SN for single units */}
                                       {unit.unit_type === 'single' && unit.serial_number && (
                                         <span className="text-[9px] font-mono text-[var(--text-muted)] pl-0.5">SN: {unit.serial_number}</span>
                                       )}
                                       {/* Qty breakdown pills */}
                                       <div className="flex flex-wrap gap-1 mt-0.5">
                                         <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-violet-500/10 text-violet-500" title="Good Condition">
                                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                                            {unit.quantity_good ?? 0} good
                                          </span>
                                         <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500" title="Available">
                                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                           {unit.quantity_available ?? 0} avail
                                         </span>
                                         <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/10 text-blue-500" title="Currently Rented">
                                           <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                                           {unit.quantity_rented ?? 0} rented
                                         </span>
                                         <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/10 text-rose-500" title="Damaged">
                                           <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                                           {unit.quantity_damaged ?? 0} dmg
                                         </span>
                                       </div>
                                     </div>
                                   </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-[var(--border-soft)] flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {products.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, products.length)} of {products.length} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(products.length / itemsPerPage), p + 1))}
              className="p-2 border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50"
              disabled={currentPage === Math.ceil(products.length / itemsPerPage) || products.length === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[var(--border-soft)] shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-[var(--text-main)]">{editingProductId ? 'Edit Product' : 'Add New Product'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Product Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl p-2.5 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  placeholder="e.g. Sony A7III"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Category</label>
                  <select
                    value={newProduct.category_id}
                    onChange={e => setNewProduct({...newProduct, category_id: e.target.value})}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl p-2.5 outline-none focus:border-brand-primary"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c: any) => (
                      <option key={c.category_id} value={c.category_id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Status</label>
                <label className="flex items-center gap-3 p-2.5 border border-[var(--border-soft)] rounded-xl bg-[var(--bg-app)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                  <input 
                    type="checkbox" 
                    checked={newProduct.is_active} 
                    onChange={(e) => setNewProduct({...newProduct, is_active: e.target.checked})} 
                    className="w-5 h-5 text-brand-primary rounded focus:ring-brand-primary accent-brand-primary cursor-pointer border-[var(--border-soft)]"
                  />
                  <span className="text-sm font-medium text-[var(--text-main)]">{newProduct.is_active ? 'Active' : 'Inactive'}</span>
                </label>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-brand-primary" />
                  <h3 className="font-bold text-[var(--text-main)]">Product Units (Required)</h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-4">You must add at least one physical unit / serial number to track.</p>
                
                {units.map((unit, i) => (
                  <div key={i} className="flex flex-col gap-3 p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-soft)] mb-4 group/unit relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex gap-2 items-center col-span-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Unit Type:</label>
                        <div className="flex bg-[var(--bg-surface)] rounded-lg p-0.5 border border-[var(--border-soft)]">
                          <button 
                            onClick={() => {
                              const newUnits = [...units];
                              newUnits[i].unit_type = 'single';
                              setUnits(newUnits);
                            }}
                            className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                              unit.unit_type === 'single' ? "bg-brand-primary text-brand-accent shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            )}
                          >Single</button>
                          <button 
                            onClick={() => {
                              const newUnits = [...units];
                              newUnits[i].unit_type = 'bulk';
                              setUnits(newUnits);
                            }}
                            className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                              unit.unit_type === 'bulk' ? "bg-brand-primary text-brand-accent shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            )}
                          >Bulk</button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Unit Name (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Unit A" 
                          value={unit.name}
                          onChange={(e) => {
                            const newUnits = [...units];
                            newUnits[i].name = e.target.value;
                            setUnits(newUnits);
                          }}
                          className="w-full border border-[var(--border-soft)] rounded-xl p-2 outline-none focus:border-brand-primary text-sm bg-[var(--bg-surface)] text-[var(--text-main)]"
                        />
                      </div>
                      
                      {unit.unit_type === 'single' ? (
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Serial Number</label>
                          <input 
                            type="text" 
                            placeholder="SN000000" 
                            required
                            value={unit.serial_number}
                            onChange={(e) => {
                              const newUnits = [...units];
                              newUnits[i].serial_number = e.target.value;
                              setUnits(newUnits);
                            }}
                            className="w-full border border-[var(--border-soft)] rounded-xl p-2 outline-none focus:border-brand-primary text-sm bg-[var(--bg-surface)] text-[var(--text-main)]"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Quantity</label>
                          <input 
                            type="number" 
                            placeholder="Quantity" 
                            required
                            value={unit.quantity}
                            onChange={(e) => {
                              const newUnits = [...units];
                              newUnits[i].quantity = parseInt(e.target.value) || 1;
                              setUnits(newUnits);
                            }}
                            className="w-full border border-[var(--border-soft)] rounded-xl p-2 outline-none focus:border-brand-primary text-sm bg-[var(--bg-surface)] text-[var(--text-main)]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Quantity Breakdown — editable damaged stepper + derived displays */}
                    {(unit as any).product_unit_id ? (
                      <div className="space-y-3 p-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Quantity Breakdown</p>
                        {/* Damaged stepper — user-editable */}
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Damaged
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newUnits = [...units];
                                const cur = (newUnits[i] as any).quantity_damaged ?? 0;
                                (newUnits[i] as any).quantity_damaged = Math.max(0, cur - 1);
                                setUnits(newUnits);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded bg-rose-500/10 text-rose-600 font-black hover:bg-rose-500/20 transition-colors"
                            >−</button>
                            <span className="w-8 text-center font-black text-rose-500 text-sm">
                              {(unit as any).quantity_damaged ?? 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newUnits = [...units];
                                const cur = (newUnits[i] as any).quantity_damaged ?? 0;
                                const max = parseInt(String(unit.quantity)) || 1;
                                (newUnits[i] as any).quantity_damaged = Math.min(max, cur + 1);
                                setUnits(newUnits);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded bg-rose-500/10 text-rose-500 font-black hover:bg-rose-500/20 transition-colors"
                            >+</button>
                          </div>
                        </div>
                        {/* Derived read-only stats */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase text-emerald-500">Good</span>
                            <span className="font-black text-emerald-500">
                              {Math.max(0, (parseInt(String(unit.quantity)) || 0) - ((unit as any).quantity_damaged ?? 0))}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase text-blue-500">Available</span>
                            <span className="font-black text-blue-500">
                              {Math.max(0,
                                Math.max(0, (parseInt(String(unit.quantity)) || 0) - ((unit as any).quantity_damaged ?? 0))
                                - ((unit as any).quantity_rented ?? 0)
                              )}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Rented</span>
                            <span className="font-black text-[var(--text-main)]">{(unit as any).quantity_rented ?? 0}</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-[var(--text-muted)] italic">
                          Good = Total − Damaged &nbsp;|&nbsp; Available = Good − Rented
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[var(--text-muted)] italic px-1">Quantity breakdown will appear after saving.</p>
                    )}

                    {/* Financial Info & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-soft)]">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Unit Status</label>
                        <select 
                          value={unit.status}
                          onChange={(e) => {
                            const newUnits = [...units];
                            newUnits[i].status = e.target.value;
                            setUnits(newUnits);
                          }}
                          className="w-full text-sm font-semibold bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl px-3 py-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                        >
                          <option value="available">Available</option>
                          <option value="rented">Rented</option>
                          <option value="damaged">Damaged</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Unit Cost Price</label>
                        <div className="relative group/input text-[var(--text-main)]">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)] group-focus-within/input:text-brand-primary transition-colors">{currencySymbol}</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            value={unit.unit_cost_price}
                            onChange={(e) => {
                              const newUnits = [...units];
                              newUnits[i].unit_cost_price = e.target.value;
                              setUnits(newUnits);
                            }}
                            className="w-full pl-8 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm font-bold outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Rental Rate</label>
                        <div className="relative group/input">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)] group-focus-within/input:text-brand-primary transition-colors">{currencySymbol}</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            value={unit.rental_price}
                            onChange={(e) => {
                              const newUnits = [...units];
                              newUnits[i].rental_price = e.target.value;
                              setUnits(newUnits);
                            }}
                            className="w-full pl-8 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm font-black text-brand-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Rental Unit</label>
                        <select 
                          value={unit.unit}
                          onChange={(e) => {
                            const newUnits = [...units];
                            newUnits[i].unit = e.target.value;
                            setUnits(newUnits);
                          }}
                          className="w-full text-sm font-bold bg-[var(--bg-app)] border-none text-[var(--text-main)] rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                        >
                          <option value="pcs">Piece (pcs)</option>
                          <option value="per_hour">Per Hour</option>
                          <option value="per_day">Per Day</option>
                          <option value="per_week">Per Week</option>
                        </select>
                      </div>
                    </div>

                    {/* Delete button positioned at top right of the unit card */}
                    {units.length > 1 && (
                      <button 
                        onClick={() => setUnits(units.filter((_, idx) => idx !== i))} 
                        className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-rose-500 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover/unit:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button 
                  onClick={() => setUnits([...units, { name: '', serial_number: '', status: 'available', unit_type: 'single', quantity: 1, unit_cost_price: '0.00', cost_price: '0.00', rental_price: '0.00', unit: 'per_day' }])}
                  className="flex items-center gap-2 text-brand-primary text-sm font-bold mt-2 hover:bg-brand-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Another Unit / Batch
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[var(--border-subtle)]">
                      <button onClick={() => { setShowAddModal(false); setEditingProductId(null); setNewProduct({ name: '', category_id: '', is_active: true }); setUnits([{ name: '', serial_number: '', status: 'available', unit_type: 'single', quantity: 1, unit_cost_price: '0.00', cost_price: '0.00', rental_price: '0.00', unit: 'per_day' }]); }} className="px-5 py-2.5 text-[var(--text-muted)] font-medium hover:bg-[var(--bg-app)] rounded-xl transition-colors">Cancel</button>
              <button 
                onClick={handleSaveProduct} 
                className="px-5 py-2.5 bg-brand-primary text-brand-accent font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-brand-primary/20"
              >
                {editingProductId ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full shadow-2xl border border-[var(--border-soft)] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50">
              <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                Manage Categories
              </h2>
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSaveCategory} className="space-y-4 mb-6 relative">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                    {editCategoryId ? 'Edit Category Name' : 'New Category Name'}
                  </label>
                  <input 
                    type="text" 
                    required
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Lighting"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary transition-colors text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Description (Optional)</label>
                  <input 
                    type="text"
                    value={newCategoryDesc}
                    onChange={e => setNewCategoryDesc(e.target.value)}
                    placeholder="Brief description of this category"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary transition-colors text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Status</label>
                  <label className="flex items-center gap-3 p-2.5 border border-[var(--border-soft)] rounded-xl bg-[var(--bg-app)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                    <input 
                      type="checkbox" 
                      checked={newCategoryIsActive} 
                      onChange={(e) => setNewCategoryIsActive(e.target.checked)} 
                      className="w-5 h-5 text-brand-primary rounded focus:ring-brand-primary accent-brand-primary cursor-pointer border-[var(--border-soft)]"
                    />
                    <span className="text-sm font-medium text-[var(--text-main)]">{newCategoryIsActive ? 'Active' : 'Inactive'}</span>
                  </label>
                </div>
                <div className="flex justify-end pt-2 gap-2">
                  {editCategoryId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditCategoryId(null);
                        setNewCategoryName('');
                        setNewCategoryDesc('');
                        setNewCategoryIsActive(true);
                      }}
                      className="bg-[var(--bg-app)] text-[var(--text-muted)] px-5 py-2.5 rounded-xl font-medium hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] transition-colors whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="bg-brand-primary text-brand-accent px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    {editCategoryId ? (
                      <><Edit2 className="w-5 h-5 inline mr-1" /> Update Category</>
                    ) : (
                      <><Plus className="w-5 h-5 inline mr-1" /> Add Category</>
                    )}
                  </button>
                </div>
              </form>

              <label className="block text-sm font-medium text-[var(--text-muted)] mb-2 mt-6 border-t border-[var(--border-subtle)] pt-6">Existing Categories</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm italic">No categories created yet.</p>
                ) : categories.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 border border-[var(--border-soft)] rounded-lg bg-[var(--bg-app)]">
                    <div className="flex flex-col">
                      <span className="font-medium text-[var(--text-main)]">{c.name}</span>
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <span className={cn("inline-block w-2 h-2 rounded-full", c.is_active ? "bg-emerald-500" : "bg-[var(--border-soft)]")} />
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditCategoryClick(c)} className="text-[var(--text-muted)] hover:text-brand-primary hover:bg-brand-primary/10 p-1.5 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCategory(c.id || c.category_id)} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Drill-down Modal */}
      {showDrillDown && drillDownProduct && (
        <div className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[var(--border-soft)] flex flex-col max-h-[85vh]">
            <div className="px-8 py-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-main)]">{drillDownProduct.name}</h2>
                <p className="text-sm text-[var(--text-muted)] font-medium capitalize">
                  Viewing {drillDownType} units
                </p>
              </div>
              <button 
                onClick={() => setShowDrillDown(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-xl transition-all border border-transparent hover:border-[var(--border-soft)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-3">
                {(drillDownProduct.units || [])
                  .filter((u: any) => {
                    if (drillDownType === 'total') return true;
                    if (drillDownType === 'good') return u.status !== 'damaged';
                    if (drillDownType === 'available') return u.status === 'available';
                    if (drillDownType === 'damaged') return u.status === 'damaged';
                    return true;
                  })
                  .map((unit: any) => (
                    <div key={unit.product_unit_id} className="flex items-center justify-between p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-soft)] group hover:border-brand-primary/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-soft)] text-[var(--text-muted)] group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-colors">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-main)]">{unit.serial_number}</p>
                          <p className="text-xs text-[var(--text-muted)]">{unit.name || 'No unit name'}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        unit.status === 'available' ? "bg-emerald-500/10 text-emerald-500" :
                        unit.status === 'rented' ? "bg-blue-500/10 text-blue-500" :
                        unit.status === 'damaged' ? "bg-rose-500/10 text-rose-500" :
                        "bg-[var(--bg-app)] text-[var(--text-muted)]"
                      )}>
                        {unit.status}
                      </span>
                    </div>
                  ))}
                
                {(!drillDownProduct.units || drillDownProduct.units.length === 0) && (
                  <div className="text-center py-12 text-[var(--text-muted)] font-medium">
                    No units found for this category.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
