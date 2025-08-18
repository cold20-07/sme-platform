import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase, mcpDb, Database } from '@/lib/supabase';
import { queryKeys, optimisticUpdates, createLoadingState } from '@/lib/react-query';

// Types
type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

// Company list filters
export interface CompanyFilters {
  industry?: string;
  legal_structure?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Company metrics interface
export interface CompanyMetrics {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  customer_count: number;
}

// Hook to fetch companies list
export function useCompanies(filters: CompanyFilters = {}) {
  const query = useQuery({
    queryKey: queryKeys.companies.list(filters),
    queryFn: async () => {
      const result = await mcpDb.query({
        table: 'companies',
        select: ['*'],
        filter: {
          ...(filters.industry && { industry: filters.industry }),
          ...(filters.legal_structure && { legal_structure: filters.legal_structure }),
        },
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      });

      if (result.error) {
        throw result.error;
      }

      // Apply search filter on client side for now
      let data = result.data || [];
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        data = data.filter(company => 
          company.name.toLowerCase().includes(searchTerm) ||
          company.email?.toLowerCase().includes(searchTerm) ||
          company.phone?.toLowerCase().includes(searchTerm)
        );
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...query,
    loadingState: createLoadingState(query),
  };
}

// Hook to fetch single company
export function useCompany(id: string) {
  const query = useQuery({
    queryKey: queryKeys.companies.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
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

// Hook to fetch company metrics
export function useCompanyMetrics(
  companyId: string, 
  dateRange?: { from: string; to: string }
) {
  const query = useQuery({
    queryKey: queryKeys.companies.metrics(companyId, dateRange),
    queryFn: async (): Promise<CompanyMetrics> => {
      const result = await mcpDb.callFunction('get_company_metrics', {
        company_id: companyId,
        date_from: dateRange?.from,
        date_to: dateRange?.to,
      });

      if (result.error) {
        throw result.error;
      }

      return result.data?.[0] || {
        total_orders: 0,
        total_revenue: 0,
        avg_order_value: 0,
        customer_count: 0,
      };
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes for metrics
  });

  return {
    ...query,
    loadingState: createLoadingState(query),
  };
}

// Hook to create company
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: CompanyInsert): Promise<Company> => {
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newCompany) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.lists() });

      // Optimistically add to cache
      const tempId = `temp-${Date.now()}`;
      const optimisticCompany: Company = {
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...newCompany,
      } as Company;

      // Add to all company lists in cache
      queryClient.getQueryCache().findAll({ queryKey: queryKeys.companies.lists() })
        .forEach(query => {
          if (query.state.data) {
            optimisticUpdates.addToList(query.queryKey, optimisticCompany);
          }
        });

      return { optimisticCompany };
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic update with real data
      if (context?.optimisticCompany) {
        queryClient.getQueryCache().findAll({ queryKey: queryKeys.companies.lists() })
          .forEach(query => {
            if (query.state.data) {
              optimisticUpdates.updateInList(
                query.queryKey,
                context.optimisticCompany.id,
                data
              );
            }
          });
      }

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      
      toast.success('Company created successfully');
    },
    onError: (error, variables, context) => {
      // Remove optimistic update on error
      if (context?.optimisticCompany) {
        queryClient.getQueryCache().findAll({ queryKey: queryKeys.companies.lists() })
          .forEach(query => {
            if (query.state.data) {
              optimisticUpdates.removeFromList(
                query.queryKey,
                context.optimisticCompany.id
              );
            }
          });
      }
    },
  });
}

// Hook to update company
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CompanyUpdate }): Promise<Company> => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.lists() });

      // Optimistically update single company
      const previousCompany = queryClient.getQueryData(queryKeys.companies.detail(id));
      if (previousCompany) {
        optimisticUpdates.updateItem(queryKeys.companies.detail(id), updates);
      }

      // Optimistically update in lists
      queryClient.getQueryCache().findAll({ queryKey: queryKeys.companies.lists() })
        .forEach(query => {
          if (query.state.data) {
            optimisticUpdates.updateInList(query.queryKey, id, updates);
          }
        });

      return { previousCompany };
    },
    onSuccess: (data, { id }) => {
      // Update cache with real data
      queryClient.setQueryData(queryKeys.companies.detail(id), data);
      
      // Update in lists
      queryClient.getQueryCache().findAll({ queryKey: queryKeys.companies.lists() })
        .forEach(query => {
          if (query.state.data) {
            optimisticUpdates.updateInList(query.queryKey, id, data);
          }
        });

      toast.success('Company updated successfully');
    },
    onError: (error, { id }, context) => {
      // Revert optimistic update on error
      if (context?.previousCompany) {
        queryClient.setQueryData(queryKeys.companies.detail(id), context.previousCompany);
      }
      
      // Invalidate to refetch correct data
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
    },
  });
}

// Hook to delete company
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.lists() });

      // Get the company data before deletion for rollback
      const previousCompany = queryClient.getQueryData(queryKeys.companies.detail(id));

      // Optimistically remove from lists
      queryClient.getQueryCache().findAll({ queryKey: queryKeys.companies.lists() })
        .forEach(query => {
          if (query.state.data) {
            optimisticUpdates.removeFromList(query.queryKey, id);
          }
        });

      // Remove single company query
      queryClient.removeQueries({ queryKey: queryKeys.companies.detail(id) });

      return { previousCompany };
    },
    onSuccess: (data, id) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      queryClient.removeQueries({ queryKey: queryKeys.companies.detail(id) });
      
      toast.success('Company deleted successfully');
    },
    onError: (error, id, context) => {
      // Restore the company on error
      if (context?.previousCompany) {
        queryClient.setQueryData(queryKeys.companies.detail(id), context.previousCompany);
        
        // Add back to lists
        queryClient.getQueryCache().findAll({ queryKey: queryKeys.companies.lists() })
          .forEach(query => {
            if (query.state.data) {
              optimisticUpdates.addToList(query.queryKey, context.previousCompany as Company);
            }
          });
      }
      
      // Invalidate to refetch correct data
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
    },
  });
}

// Hook to prefetch company data
export function usePrefetchCompany() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.companies.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('companies')
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