'use client'

import React from 'react'
import styles from './QuickStats.module.scss'
import TierBadge from '../TierBadge'
import { useAuthStore } from '../../../store/useAuthStore'
import { SkeletonStatCard } from '../Skeleton'
import { motion } from 'framer-motion'

interface QuickStatsProps {
    totalAnalyses: number
    postsAnalyzed: number
    activeSources: number
    loading: boolean
}

export default function QuickStats({ totalAnalyses, postsAnalyzed, activeSources, loading }: QuickStatsProps) {
    const { user } = useAuthStore()

    if (loading) {
        return (
            <div className={styles.statsGrid}>
                <SkeletonStatCard />
                <SkeletonStatCard />
                <SkeletonStatCard />
                <SkeletonStatCard />
            </div>
        )
    }

    const stats = [
        { label: 'Total Analyses', value: totalAnalyses.toLocaleString() },
        { label: 'Posts Analyzed', value: postsAnalyzed.toLocaleString() },
        { label: 'Active Sources', value: activeSources.toString() },
        { 
            label: 'Current Tier', 
            value: <TierBadge tier={user?.subscriptionTier || 'free'} size="lg" />,
            isComponent: true
        }
    ]

    return (
        <div className={styles.statsGrid}>
            {stats.map((stat, idx) => (
                <motion.div 
                    key={stat.label}
                    className={styles.statCard}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.4 }}
                >
                    <div className={styles.label}>{stat.label}</div>
                    <div className={styles.value}>
                        {stat.value}
                    </div>
                </motion.div>
            ))}
        </div>
    )
}
