'use client';

import React, { useState } from 'react';
import { Plus, Search, Filter, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LoadingStateHandler, 
  DataWrapper, 
  LoadingButton, 
  TableSkeleton,
  CardSkeleton 
} from '@/components/ui/loading-states';
import { 
  useProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  useLowStockProducts,
  ProductFilters 
} from '@/hooks/use-products';
import { useOptimisticMutation } from '@/hooks/use-optimistic-mutation';
import { queryKeys } from '@/lib/react-query';

// Example component demonstrating React Query optimization
export function ProductsExample({ companyId }: { companyId: string }) {
  const [filters, setFilters] = useState<ProductFilters>({
    company_id: companyId,
    status: 'active',
    limit: 20,
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Use the optimized React Query hooks
  const productsQuery = useProducts({ ...filters, search: searchTerm });
  const lowStockQuery = useLowStockProducts(companyId);
  
  // Optimistic mutations
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  // Example of custom optimistic mutation
  const bulkUpdateMutation = useOptimisticMutation({
    mutationFn: async (updates: { id: string; updates: any }[]) => {
      // Simulate bulk update API call
      const results = await Promise.all(
        updates.map(async ({ id, updates }) => {
          // In real implementation, this would be a single API call
          const data = await updateProductMutation.mutateAsync({ id, updates });
          return data;
        })
      );
      return results;
    },
    invalidateQueries: [
      [...queryKeys.products.lists()],
      [...queryKeys.products.lowStock()],
    ],
    successMessage: (data) => `Successfully updated ${data.length} products`,
    errorMessage: 'Failed to update products',
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleCreateProduct = async (productData: any) => {
    try {
      await createProductMutation.mutateAsync({
        ...productData,
        company_id: companyId,
      });
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to create product:', error);
    }
  };

  const handleUpdateProduct = async (id: string, updates: any) => {
    try {
      await updateProductMutation.mutateAsync({ id, updates });
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to update product:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProductMutation.mutateAsync(id);
      } catch (error) {
        // Error is handled by the mutation hook
        console.error('Failed to delete product:', error);
      }
    }
  };

  const handleBulkStatusUpdate = async (productIds: string[], status: 'active' | 'inactive') => {
    const updates = productIds.map(id => ({
      id,
      updates: { status, updated_at: new Date().toISOString() },
    }));

    try {
      await bulkUpdateMutation.mutateAsync(updates);
    } catch (error) {
      console.error('Failed to bulk update products:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-gray-600">Manage your product inventory</p>
        </div>
        <LoadingButton
          isLoading={createProductMutation.isPending}
          onClick={() => handleCreateProduct({
            name: 'New Product',
            sku: `SKU-${Date.now()}`,
            price: 0,
            stock_quantity: 0,
            reorder_level: 5,
          })}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </LoadingButton>
      </div>

      {/* Low Stock Alert */}
      <LoadingStateHandler
        loadingState={lowStockQuery.loadingState}
        loadingComponent={<CardSkeleton />}
        onRetry={() => lowStockQuery.refetch()}
      >
        <DataWrapper
          data={lowStockQuery.data}
          loadingState={lowStockQuery.loadingState}
          emptyMessage="No low stock products"
        >
          {(lowStockProducts) => (
            Array.isArray(lowStockProducts) && lowStockProducts.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-5 w-5" />
                    Low Stock Alert
                  </CardTitle>
                  <CardDescription>
                    {Array.isArray(lowStockProducts) ? lowStockProducts.length : 0} products are running low on stock
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.isArray(lowStockProducts) && lowStockProducts.slice(0, 6).map((product: any) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.sku}</p>
                        </div>
                        <Badge variant="destructive">
                          {product.stock_quantity} left
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </DataWrapper>
      </LoadingStateHandler>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filters.status === 'active' ? 'default' : 'outline'}
                onClick={() => handleFilterChange({ status: 'active' })}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={filters.status === 'inactive' ? 'default' : 'outline'}
                onClick={() => handleFilterChange({ status: 'inactive' })}
                size="sm"
              >
                Inactive
              </Button>
              <Button
                variant={filters.low_stock ? 'default' : 'outline'}
                onClick={() => handleFilterChange({ low_stock: !filters.low_stock })}
                size="sm"
              >
                <Filter className="h-4 w-4 mr-1" />
                Low Stock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products
          </CardTitle>
          <CardDescription>
            {productsQuery.data?.length || 0} products found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingStateHandler
            loadingState={productsQuery.loadingState}
            loadingComponent={<TableSkeleton rows={5} columns={6} />}
            onRetry={() => productsQuery.refetch()}
          >
            <DataWrapper
              data={productsQuery.data}
              loadingState={productsQuery.loadingState}
              emptyMessage="No products found. Create your first product to get started."
            >
              {(products) => (
                <div className="space-y-4">
                  {/* Bulk Actions */}
                  {products.length > 0 && (
                    <div className="flex gap-2">
                      <LoadingButton
                        isLoading={bulkUpdateMutation.isPending}
                        onClick={() => handleBulkStatusUpdate(
                          products.slice(0, 3).map((p: any) => p.id), 
                          'inactive'
                        )}
                        variant="outline"
                        size="sm"
                      >
                        Bulk Deactivate (Demo)
                      </LoadingButton>
                    </div>
                  )}

                  {/* Products Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">SKU</th>
                          <th className="text-left p-2">Price</th>
                          <th className="text-left p-2">Stock</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product: any) => (
                          <tr key={product.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.description && (
                                  <p className="text-sm text-gray-600 truncate max-w-xs">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-2 font-mono text-sm">{product.sku}</td>
                            <td className="p-2">${product.price.toFixed(2)}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <span>{product.stock_quantity}</span>
                                {product.stock_quantity <= product.reorder_level && (
                                  <Badge variant="destructive" className="text-xs">
                                    Low
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              <Badge 
                                variant={product.status === 'active' ? 'default' : 'secondary'}
                              >
                                {product.status}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <LoadingButton
                                  isLoading={updateProductMutation.isPending}
                                  onClick={() => handleUpdateProduct(product.id, {
                                    status: product.status === 'active' ? 'inactive' : 'active'
                                  })}
                                  variant="outline"
                                  size="sm"
                                >
                                  Toggle
                                </LoadingButton>
                                <LoadingButton
                                  isLoading={deleteProductMutation.isPending}
                                  onClick={() => handleDeleteProduct(product.id)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  Delete
                                </LoadingButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Showing {products.length} products
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFilterChange({ 
                          offset: Math.max(0, (filters.offset || 0) - (filters.limit || 20))
                        })}
                        disabled={!filters.offset || filters.offset === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFilterChange({ 
                          offset: (filters.offset || 0) + (filters.limit || 20)
                        })}
                        disabled={products.length < (filters.limit || 20)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DataWrapper>
          </LoadingStateHandler>
        </CardContent>
      </Card>

      {/* Loading Overlay for Bulk Operations */}
      {bulkUpdateMutation.isPending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <p className="font-medium">Updating products...</p>
                <p className="text-sm text-gray-600">Please wait while we process your request</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}