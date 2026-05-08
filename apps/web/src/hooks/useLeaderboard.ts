import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface LeaderboardEntry {
  cashier_id: string;
  name: string;
  avatar_url: string | null;
  revenue: number;
  transactions: number;
  avg_sale: number;
}

export interface PerfectAttendance {
  id: string;
  name: string;
}

export interface LeaderboardData {
  top_by_revenue: LeaderboardEntry[];
  top_by_transactions: LeaderboardEntry[];
  top_by_avg_sale: LeaderboardEntry[];
  perfect_attendance: PerfectAttendance[];
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get<LeaderboardData>('/reports/leaderboard'),
    staleTime: 5 * 60 * 1000,
  });
}
