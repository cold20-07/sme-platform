import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase, mcpDb, Database } from '@/lib/supabase';
import { queryKeys, optimisticUpdates, createLoadingState } from '@/lib/react-query';

// Types
type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

// Product list filters
export interface ProductFilters {
  company_id?: string;
  category?: string;
  status?: 'active' | 'inactive';
  search?: string;
  low_stock?: boolean;
  limit?: number;
  offset?: number;
}

// Low stock product interface
export interface LowStockProduct {
  id: string;
  company_id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  reorder_level: number;
  shortage: number;
}

// Hook to fetch products list
export function useProducts(filters: ProductFilters = {}) {
  const query = useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const result = await mcpDb.query({
        table: 'products',
        select: ['*'],
        filter: {
          ...(filters.company_id && { company_id: filters.company_id }),
          ...(filters.category && { category: filters.category }),
          ...(filters.status && { status: filters.status }),
        },
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        orderBy: [{ column: 'name', ascending: true }],
      });

      if (result.error) {
        throw result.error;
      }

      let data = result.data || [];

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        data = data.filter(product => 
          product.name.toLowerCase().includes(searchTerm) ||
          product.sku.toLowerCase().includes(searchTerm) ||
          product.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply low stock filter
      if (filters.low_stock) {
        data = data.filter(product => 
          product.stock_quantity <= product.reorder_level
        );
      }

      return data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  return {
    ...query,
    loadingState: createLoadingState(query),
  };
}

// Hook to fetch single product
export function useProduct(id: string) {
  const query = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    ...query,
    loadingState: createLoadingState(query),
  };
}

// Hook to fetch low stock products
export function useLowStockProducts(companyId?: string) {
  const query = useQuery({
    queryKey: queryKeys.products.lowStock(),
    queryFn: async (): Promise<LowStockProduct[]> => {
      const { data, error } = await supabase
        .from('low_stock_products')
        .select('*')
        .eq(companyId ? 'company_id' : 'id', companyId || 'dummy');

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 1 * 60 * 1000, // 1 minute for critical stock data
  });

  return {
    ...query,
    loadingState: createLoadingState(query),
  };
}

// Hook to create product
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: ProductInsert): Promise<Product> => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newProduct) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.products.lists() });

      // Create optimistic product
      const tempId = `temp-${Date.now()}`;
      const optimisticProduct: Product = {
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stock_quantity: 0,
        reorder_level: 0,
        status: 'active',
        ...newProduct,
      } as Product;

      // Add to relevant product lists
      queryClient.getQueryCache().findAll({ queryKey: queryKeys.products.lists() })
        .forEach(query => {
          if (query.state.data) {
            // Check if this product matches the query filters
            const queryKey = query.queryKey;
            const filters = queryKey[2] as ProductFilters;
            
            if (!filters.company_id || filters.company_id === newProduct.company_id) {
              optimisticUpdates.addToList(query.queryKey, optimisticProduct);
            }
          }
        });

      return { optimisticProduct };
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic update with real data
      if (context?.optimisticProduct) {
        queryClient.getQueryCache().findAll({ queryKey: queryKeys.products.lists() })
          .forEach(query => {
            if (query.state.data) {
              optimisticUpdates.updateInList(
                query.queryKey,
                context.optimisticProduct.id,
                data
              );
            }
          });
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lowStock() });
      
      toast.success('Product created successfully');
    },
    onError: (error, variables, context) => {
      // Remove optimistic update on error
      if (context?.optimisticProduct) {
        queryClient.getQueryCache().findAll({ queryKey: queryKeys.products.lists() })
          .forEach(query => {
            if (query.state.data) {
              optimisticUpdates.removeFromList(
                query.queryKey,
                context.optimisticProduct.id
              );
            }
          });
      }
    },
  });
}

// Hook to update product
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProductUpdate }): Promise<Product> => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.products.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.products.lists() });

      // Get previous data for rollback
      const previousProduct = queryClient.getQueryData(queryKeys.products.detail(id));

      // Optimistically update single product
      if (previousProduct) {
        optimisticUpdates.updateItem(queryKeys.products.detail(id), updates);
      }

      // Optimistically update in lists
      queryClient.getQueryCache().findAll({ queryKey: queryKeys.products.lists() })
        .forEach(query => {
          if (query.state.data) {
            optimisticUpdates.updateInList(query.queryKey, id, updates);
          }
        });

      return { previousProduct };
    },
    onSuccess: (data, { id }) => {
      // Update cache with real data
      queryClient.setQueryData(queryKeys.products.detail(id), data);
      
      // Update in lists
      queryClient.getQueryCache().findAll({ queryKey: queryKeys.products.lists() })
        .forEach(query => {
          if (query.state.data) {
            optimisticUpdates.updateInList(query.queryKey, id, data);
          }
        });

      // Invalidate low stock if stock was updated
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lowStock() });

      toast.success('Product updated successfully');
    },
    onError: (error, { id }, context) => {
      // Revert optimistic update on error
      if (context?.previousProduct) {
        queryClient.setQueryData(queryKeys.products.detail(id), context.previousProduct);
      }
      
      // Invalidate to refetch correct data
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
  });
}

// Hook to update product stock
export function useUpdateProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantityChange }: { productId: string; quantityChange: number }) => {
      const result = await mcpDb.callFunction('update_product_stock', {
        product_id: productId,
        quantity_change: quantityChange,
      });

      if (result.error) {
        throw result.error;
      }

      return result.data?.[0];
    },
    onMutate: async ({ productId, quantityChange }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.products.detail(productId) });

      // Get current product data
      const previousProduct = queryClient.getQueryData(queryKeys.products.detail(productId)) as Product;

      if (previousProduct) {
        // Optimistically update stock
        const newStock = Math.max(0, previousProduct.stock_quantity + quantityChange);
        queryClient.setQueryData(queryKeys.products.detail(productId), (oldData: Product | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          };
        });

        // Update in lists
        queryClient.getQueryCache().findAll({ queryKey: queryKeys.products.lists() })
          .forEach(query => {
            if (query.state.data) {
              queryClient.setQueryData(query.queryKey, (oldData: Product[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.map(item => 
                  item.id === productId 
                    ? { ...item, stock_quantity: newStock, updated_at: new Date().toISOString() }
                    : item
                );
              });
            }
          });
      }

      return { previousProduct };
    },
    onSuccess: (data, { productId }) => {
      if (data?.success) {
        // Update with actual stock value from database
        queryClient.setQueryData(queryKeys.products.detail(productId), (oldData: Product | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            stock_quantity: data.new_stock,
            updated_at: new Date().toISOString(),
          };
        });

        // Update in lists
        queryClient.getQueryCache().findAll({ queryKey: queryKeys.products.lists() })
          .forEach(query => {
            if (query.state.data) {
              queryClient.setQueryData(query.queryKey, (oldData: Product[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.map(item => 
                  item.id === productId 
                    ? { ...item, stock_quantity: data.new_stock, updated_at: new Date().toISOString() }
                    : item
                );
              });
            }
          });

        // Invalidate low stock products
        queryClient.invalidateQueries({ queryKey: queryKeys.products.lowStock() });

        toast.success('Stock updated successfully');
      }
    },
    onError: (error, { productId }, context) => {
      // Revert optimistic update on error
      if (context?.previousProduct) {
        queryClient.setQueryData(queryKeys.products.detail(productId), context.previousProduct);
      }
      
      // Invalidate to refetch correct data
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
  });
}

// Hook to delete product
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.products.lists() });

      // Get the product data before deletion for rollback
      const previousProduct = queryClient.getQueryData(queryKeys.products.detail(id));

      // Optimistically remove from lists
      queryClient.getQueryCache().findAll({ queryKey: queryKeys.products.lists() })
        .forEach(query => {
          if (query.state.data) {
            optimisticUpdates.removeFromList(query.queryKey, id);
          }
        });

      // Remove single product query
      queryClient.removeQueries({ queryKey: queryKeys.products.detail(id) });

      return { previousProduct };
    },
    onSuccess: (data, id) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lowStock() });
      queryClient.removeQueries({ queryKey: queryKeys.products.detail(id) });
      
      toast.success('Product deleted successfully');
    },
    onError: (error, id, context) => {
      // Restore the product on error
      if (context?.previousProduct) {
        queryClient.setQueryData(queryKeys.products.detail(id), context.previousProduct);
        
        // Add back to lists
        queryClient.getQueryCache().findAll({ queryKey: queryKeys.products.lists() })
          .forEach(query => {
            if (query.state.data) {
              optimisticUpdates.addToList(query.queryKey, context.previousProduct as Product);
            }
          });
      }
      
      // Invalidate to refetch correct data
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
  });
}

// Hook to prefetch product data
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data;
      },
      staleTime: 10 * 60 * 1000,
    });
  };
}