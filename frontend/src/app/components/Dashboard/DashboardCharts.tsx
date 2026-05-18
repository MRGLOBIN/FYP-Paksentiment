'use client'

import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './DashboardCharts.module.scss'
import { Activity } from '../../../types'

interface DashboardChartsProps {
    activities: Activity[]
}

export function DashboardCharts({ activities }: DashboardChartsProps) {
    const timelineData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })

        const counts: Record<string, number> = {}
        last7Days.forEach(day => counts[day] = 0)

        activities.forEach(a => {
            if (a.action.includes('ANALYZE') || a.action.includes('SEARCH') || a.action.includes('SMART')) {
                const day = new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                if (counts[day] !== undefined) {
                    counts[day]++
                }
            }
        })

        return last7Days.map(day => ({
            name: day,
            Analyses: counts[day]
        }))
    }, [activities])

    const totalAnalyses = timelineData.reduce((acc, curr) => acc + curr.Analyses, 0)

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h3>Activity Timeline</h3>
                    <p>Searches & Analyses in the last 7 days</p>
                </div>
                
                <div className={styles.chartWrapper} style={{ height: '280px', marginTop: '1rem' }}>
                    {totalAnalyses > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="var(--text-muted)" 
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis 
                                    stroke="var(--text-muted)" 
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--card-bg)', 
                                        borderColor: 'var(--card-border)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                                />
                                <Bar 
                                    dataKey="Analyses" 
                                    fill="var(--primary)" 
                                    radius={[4, 4, 0, 0]} 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>No recent activity</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
