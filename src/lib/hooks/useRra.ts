import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { budgetKeys } from './useBudget'

export const rraKeys = {
  all: ['rra'] as const,
  byYear: (year: number) => [...rraKeys.all, year] as const,
}

export const useRraLogs = (year: number) => {
  return useQuery({
    queryKey: rraKeys.byYear(year),
    queryFn: async () => {
      const data = await api.get(`/rra?year=${year}`)
      return data as unknown as any[]
    },
  })
}

export const useCreateRra = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => await api.post('/rra', data),
    onSuccess: (_, variables) => {
      const year = variables.year as number
      queryClient.invalidateQueries({ queryKey: rraKeys.byYear(year) })
      queryClient.invalidateQueries({ queryKey: budgetKeys.byYear(year) })
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

export const useUpdateRra = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => await api.put(`/rra/${id}`, data),
    onSuccess: (_, variables) => {
      const year = variables.data.year as number
      queryClient.invalidateQueries({ queryKey: rraKeys.byYear(year) })
      queryClient.invalidateQueries({ queryKey: budgetKeys.byYear(year) })
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}
