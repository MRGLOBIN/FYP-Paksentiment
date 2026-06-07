'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styles from './page.module.scss'
import { useAuthStore } from '../../store/useAuthStore'
import { useDashboardStore } from '../../store/useDashboardStore'
import SmartSearchBar from '../components/Dashboard/SmartSearchBar'
import QuickStats from '../components/Dashboard/QuickStats'
import RecentSessions from '../components/Dashboard/RecentSessions'
import { DashboardCharts } from '../components/Dashboard/DashboardCharts'
import { Toaster } from 'react-hot-toast'

export default function DashboardPage() {
    const { user, token, isAuthenticated } = useAuthStore()
    const { activities, loading: activitiesLoading, fetchActivities } = useDashboardStore()
    const router = useRouter()

    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        setIsChecking(false)
        if (!isAuthenticated && !token) {
            router.push('/login')
        }
    }, [isAuthenticated, token, router])

    useEffect(() => {
        if (token) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
            fetchActivities(token, apiUrl)
        }
    }, [token, fetchActivities])

    const loading = isChecking || activitiesLoading

    // Calculate stats
    const stats = useMemo(() => {
        const totalAnalyses = activities.filter(a => a.action.includes('ANALYZE') || a.action.includes('SEARCH') || a.action.includes('SMART')).length
        
        let postsAnalyzed = 0
        const sources = new Set<string>()

        activities.forEach(a => {
            if (a.details?.results && (a.details.results as any).count) {
                postsAnalyzed += (a.details.results as any).count
            } else if (a.details?.count) {
                postsAnalyzed += a.details.count as number
            }

            if (a.action.includes('REDDIT')) sources.add('reddit')
            if (a.action.includes('TWITTER')) sources.add('twitter')
            if (a.action.includes('WEB')) sources.add('web')
            if (a.action.includes('COMMONCRAWL')) sources.add('commoncrawl')
            if (a.action.includes('SMART')) sources.add('ai')
            if (a.action.includes('HACKERNEWS')) sources.add('hackernews')
            if (a.action.includes('NEWSAPI')) sources.add('newsapi')
            if (a.action.includes('NEWSDATA')) sources.add('newsdata')
            if (a.action.includes('GOOGLETRENDS')) sources.add('googletrends')
            if (a.action.includes('STACKOVERFLOW')) sources.add('stackoverflow')
        })

        return {
            totalAnalyses,
            postsAnalyzed,
            activeSources: sources.size
        }
    }, [activities])

    if (!isAuthenticated && !isChecking) {
        return null // Will redirect
    }

    return (
        <div className={styles.container}>
            <Navbar />
            <Toaster position="bottom-right" />

            <main className={styles.main}>
                <div className={styles.dashboardWrapper}>
                    {/* Hero Section */}
                    <header className={styles.hero}>
                        <div className={styles.greeting}>
                            <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.fullName?.split(' ')[0] || 'User'}.</h1>
                            <p>Welcome to your command center.</p>
                        </div>
                        
                        <div className={styles.searchSection}>
                            <SmartSearchBar />
                        </div>
                    </header>

                    {/* Stats Row */}
                    <section className={styles.statsSection}>
                        <QuickStats 
                            totalAnalyses={stats.totalAnalyses}
                            postsAnalyzed={stats.postsAnalyzed}
                            activeSources={stats.activeSources}
                            loading={loading}
                        />
                    </section>

                    {/* Main Grid */}
                    <section className={styles.mainGrid}>
                        <div className={styles.sessionsColumn}>
                            <RecentSessions activities={activities} loading={loading} />
                        </div>
                        <div className={styles.chartsColumn}>
                            <DashboardCharts activities={activities} />
                        </div>
                    </section>

                    {/* Quick Access Footer Removed */}
                </div>
            </main>

            <Footer />
        </div>
    )
}
