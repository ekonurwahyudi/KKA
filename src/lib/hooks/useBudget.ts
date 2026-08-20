import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'

interface GlAccount { id: string; code: string; description: string; keterangan: string }
interface Budget {
  id: string; glAccountId: string; year: number; rkap: number; releasePercent: number; totalAmount: number
  q1Amount: number; q2Amount: number; q3Amount: number; q4Amount: number
  janAmount: number; febAmount: number; marAmount: number; aprAmount: number
  mayAmount: number; junAmount: number; julAmount: number; augAmount: number
  sepAmount: number; octAmount: number; novAmount: number; decAmount: number
  glAccount: GlAccount; allocations: { regionalCode: string; quarter: number; amount: number; rraDelta?: number; percentage: number }[]
}

// Query keys
export const budgetKeys = {
  all: ['budgets'] as const,
  byYear: (year: number) => [...budgetKeys.all, year] as const,
}

// Fetch Budgets by Year
export const useBudgets = (year: number) => {
  return useQuery({
    queryKey: budgetKeys.byYear(year),
    queryFn: async () => {
      const data = await api.get(`/budget?year=${year}`)
      return data as unknown as Budget[]
    },
  })
}

// Create/Update Budget
export const useCreateBudget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return await api.post('/budget', data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.byYear(variables.year as number) })
    },
  })
}

// Update Budget
export const useUpdateBudget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return await api.put(`/budget/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

// Delete Budget
export const useDeleteBudget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/budget/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

// Save Allocations
export const useSaveAllocations = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (allocations: { budgetId: string; quarter: number; regionalCode: string; amount: number; percentage: number }[]) => {
      return await api.post('/budget/allocation', { allocations })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

// Import Budget
export const useImportBudget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ file, year }: { file: File; year: number }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('year', year.toString())
      return await api.post('/budget/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }) as { error?: string; success?: number; failed?: number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}
