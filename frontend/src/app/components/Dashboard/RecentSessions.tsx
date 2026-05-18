'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import styles from './RecentSessions.module.scss'
import { Activity } from '../../../types'
import { SkeletonSessionCard } from '../Skeleton'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Pagination } from '@mui/material'

interface RecentSessionsProps {
    activities: Activity[]
    loading: boolean
}

export default function RecentSessions({ activities, loading }: RecentSessionsProps) {
    // Filter to only show analysis/search activities that have a sessionId or query
    const sessionActivities = activities.filter(a => 
        (a.action.includes('ANALYZE') || a.action.includes('SEARCH') || a.action.includes('SMART')) && 
        (a.details?.sessionId || a.details?.query)
    )

    const [page, setPage] = useState(1)
    const ITEMS_PER_PAGE = 5
    const totalPages = Math.ceil(sessionActivities.length / ITEMS_PER_PAGE)
    const paginatedActivities = sessionActivities.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Recent Sessions</h2>
                </div>
                <div className={styles.list}>
                    <SkeletonSessionCard />
                    <SkeletonSessionCard />
                    <SkeletonSessionCard />
                </div>
            </div>
        )
    }

    if (sessionActivities.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Recent Sessions</h2>
                </div>
                <div className={styles.emptyState}>
                    <p>No recent analysis sessions found.</p>
                </div>
            </div>
        )
    }

    const getSourceInfo = (action: string) => {
        if (action.includes('REDDIT')) return { name: 'Reddit', color: 'var(--source-reddit)' }
        if (action.includes('TWITTER')) return { name: 'Twitter', color: 'var(--source-twitter)' }
        if (action.includes('WEB')) return { name: 'Web', color: 'var(--source-web)' }
        if (action.includes('COMMONCRAWL')) return { name: 'History', color: 'var(--source-history)' }
        if (action.includes('SMART')) return { name: 'AI Search', color: 'var(--source-ai)' }
        return { name: 'Unknown', color: 'var(--text-muted)' }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Recent Sessions</h2>
                {/* <Link href="/history" className={styles.viewAll}>View all</Link> */}
            </div>
            
            <div className={styles.list}>
                {paginatedActivities.map((activity, idx) => {
                    const sourceInfo = getSourceInfo(activity.action)
                    const query = activity.details?.query as string || 'General Analysis'
                    const sessionId = activity.details?.sessionId as string
                    
                    const href = sessionId 
                        ? `/analytics?sessionId=${sessionId}`
                        : `/analytics?mode=manual&query=${encodeURIComponent(query)}`

                    return (
                        <motion.div 
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Link href={href} className={styles.sessionCard}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.queryText} title={query}>{query}</h3>
                                </div>
                                <div className={styles.cardMeta}>
                                    <span 
                                        className={styles.sourceBadge} 
                                        style={{ backgroundColor: `${sourceInfo.color}20`, color: sourceInfo.color }}
                                    >
                                        {sourceInfo.name}
                                    </span>
                                    <span className={styles.timeAgo}>
                                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                            </Link>
                        </motion.div>
                    )
                })}
            </div>
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                    <Pagination 
                        count={totalPages} 
                        page={page} 
                        onChange={(_, value) => setPage(value)} 
                        color="primary" 
                    />
                </div>
            )}
        </div>
    )
}
