'use client';
import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Filter,
  Package,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Product CRUD logic
const initialFormState = {
  id: null,
  name: '',
  sku: '',
  category: '',
  price: 0,
  stock: 0,
  reorderLevel: 0,
  status: 'active',
  description: '',
};

const getStockStatus = (stock: number, reorderLevel: number) => {
  if (stock <= reorderLevel) {
    return { status: 'low', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
  }
  return { status: 'good', color: 'bg-green-100 text-green-800', icon: CheckCircle };
};

const getStatusColor = (status: string) => {
  return status === 'active' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
};

// Memoized product row component
const ProductRow = memo(function ProductRow({ 
  product, onEdit, onDelete 
}: { 
  product: any,
  onEdit: (product: any) => void,
  onDelete: (id: any) => void
}) {
  const stockStatus = useMemo(() => getStockStatus(product.stock, product.reorderLevel), [product.stock, product.reorderLevel]);
  const StockIcon = stockStatus.icon;
  
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{product.name}</div>
            <div className="text-sm text-gray-500">{product.description}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 font-mono text-sm">
        {product.sku}
      </td>
      <td className="py-3 px-4">
        <Badge variant="secondary">
          {product.category}
        </Badge>
      </td>
      <td className="py-3 px-4 font-medium">
        ₹{product.price.toLocaleString()}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center space-x-2">
          <StockIcon className="h-4 w-4" />
          <span className="font-medium">{product.stock}</span>
          {product.stock <= product.reorderLevel && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
              Reorder
            </Badge>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant="secondary" className={getStatusColor(product.status)}>
          {product.status}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(product)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Product
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(product.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

export default function ProductsPage() {
  type Product = {
    id: number;
    name: string;
    sku: string;
    category: string;
    price: number;
    stock: number;
    reorderLevel: number;
    status: string;
  };
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: 'Product A',
      sku: 'SKU-001',
      category: 'Electronics',
      price: 1500,
      stock: 25,
      reorderLevel: 10,
      status: 'active',
    },
    {
      id: 2,
      name: 'Product B',
      sku: 'SKU-002',
      category: 'Apparel',
      price: 800,
      stock: 40,
      reorderLevel: 15,
      status: 'active',
    },
    {
      id: 3,
      name: 'Product C',
      sku: 'SKU-003',
      category: 'Stationery',
      price: 120,
      stock: 100,
      reorderLevel: 20,
      status: 'inactive',
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialFormState);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*');
    if (!error) setProducts(data || []);
    setLoading(false);
  }

  async function handleSaveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editMode) {
      await supabase.from('products').update(form).eq('id', form.id);
    } else {
      await supabase.from('products').insert([{ ...form }]);
    }
    setShowForm(false);
    setForm(initialFormState);
    setEditMode(false);
    fetchProducts();
  }

  function handleEditProduct(product: Product) {
    setForm({
      id: product.id as any,
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
      status: product.status,
      description: '',
    });
    setEditMode(true);
    setShowForm(true);
  }

  async function handleDeleteProduct(id: number) {
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  }

  function handleAddProduct() {
    setForm(initialFormState);
    setEditMode(false);
    setShowForm(true);
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalProducts: products.length,
    lowStockProducts: products.filter(p => p.stock <= p.reorderLevel).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
    activeProducts: products.filter(p => p.status === 'active').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products & Inventory</h1>
          <p className="text-gray-600 mt-1">
            Manage your product catalog and track inventory levels
          </p>
        </div>
        <Button onClick={handleAddProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <form className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md" onSubmit={handleSaveProduct}>
            <h2 className="text-lg font-bold mb-4">{editMode ? 'Edit Product' : 'Add Product'}</h2>
            <div className="mb-3">
              <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="mb-3">
              <Input placeholder="SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required />
            </div>
            <div className="mb-3">
              <Input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
            </div>
            <div className="mb-3">
              <Input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required />
            </div>
            <div className="mb-3">
              <Input type="number" placeholder="Stock" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} required />
            </div>
            <div className="mb-3">
              <Input type="number" placeholder="Reorder Level" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: Number(e.target.value) })} required />
            </div>
            <div className="mb-3">
              <select className="w-full border rounded p-2" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="mb-3">
              <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex space-x-2">
              <Button type="submit">{editMode ? 'Update' : 'Create'}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.lowStockProducts}</div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">₹{stats.totalValue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Inventory Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{stats.activeProducts}</div>
            <p className="text-sm text-muted-foreground">Active Products</p>
          </CardContent>
        </Card>
      </div>

      {/* Product List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Catalog</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-8 w-64"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">SKU</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Price</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Stock</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <ProductRow key={product.id} product={product} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}