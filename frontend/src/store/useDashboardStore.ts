import { create } from 'zustand'
import { Activity } from '../types'

interface DashboardState {
    activities: Activity[]
    loading: boolean
    error: string | null
    fetchActivities: (token: string, apiUrl: string) => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set) => ({
    activities: [],
    loading: false,
    error: null,
    fetchActivities: async (token, apiUrl) => {
        set({ loading: true, error: null })
        try {
            const res = await fetch(`${apiUrl}/activity/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!res.ok) {
                throw new Error('Failed to fetch activities')
            }
            const data = await res.json()
            set({ activities: data, loading: false })
        } catch (err: any) {
            set({ error: err.message, loading: false })
        }
    }
}))
