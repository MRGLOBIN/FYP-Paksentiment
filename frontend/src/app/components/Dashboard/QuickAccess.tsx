'use client'

import React from 'react'
import Link from 'next/link'
import styles from './QuickAccess.module.scss'
import { Reddit, TravelExplore, Language, History, AutoAwesome } from '@mui/icons-material'
import TierGate from '../TierGate'

export default function QuickAccess() {
    const sources = [
        { id: 'reddit_sentiment', name: 'Reddit', icon: <Reddit />, color: 'var(--source-reddit)', tier: 'free' },
        { id: 'web', name: 'Web', icon: <Language />, color: 'var(--source-web)', tier: 'premium' },
        { id: 'commoncrawl', name: 'History', icon: <History />, color: 'var(--source-history)', tier: 'premium' },
        { id: 'ai', name: 'AI Search', icon: <AutoAwesome />, color: 'var(--source-ai)', tier: 'free' },
    ]

    return (
        <div className={styles.container}>
            <h3>Quick Access</h3>
            <div className={styles.grid}>
                {sources.map(source => {
                    const card = (
                        <div className={styles.card} style={{ '--source-color': source.color } as React.CSSProperties}>
                            <div className={styles.icon}>{source.icon}</div>
                            <span className={styles.name}>{source.name}</span>
                        </div>
                    )

                    const content = source.tier !== 'free' ? (
                        <TierGate requiredTier={source.tier as any}>
                            <Link href={`/analytics?source=${source.id}`} className={styles.link}>
                                {card}
                            </Link>
                        </TierGate>
                    ) : (
                        <Link href={`/analytics?source=${source.id}`} className={styles.link}>
                            {card}
                        </Link>
                    )

                    return (
                        <div key={source.id} className={styles.cardWrapper}>
                            {content}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
