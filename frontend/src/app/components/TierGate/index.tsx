'use client'

import React from 'react'
import Link from 'next/link'
import styles from './TierGate.module.scss'
import { useAuthStore } from '../../../store/useAuthStore'
import { Lock } from '@mui/icons-material'

interface TierGateProps {
    requiredTier: 'premium' | 'super_premium'
    children: React.ReactNode
    fallback?: React.ReactNode
    hideEntirely?: boolean
}

export default function TierGate({ requiredTier, children, fallback, hideEntirely = false }: TierGateProps) {
    const { user } = useAuthStore()
    const currentTier = user?.subscriptionTier || 'free'
    const isAdmin = user?.role === 'admin'

    // Hierarchy of tiers
    const tierWeight = {
        free: 0,
        premium: 1,
        super_premium: 2
    }

    const hasAccess = isAdmin || tierWeight[currentTier as keyof typeof tierWeight] >= tierWeight[requiredTier]

    if (hasAccess) {
        return <>{children}</>
    }

    if (hideEntirely) {
        return null
    }

    if (fallback) {
        return <>{fallback}</>
    }

    // Default overlay fallback
    return (
        <div className={styles.gateWrapper}>
            <div className={styles.blurredContent}>
                {children}
            </div>
            <div className={styles.overlay}>
                <div className={styles.overlayContent}>
                    <Lock className={styles.lockIcon} />
                    <h3>Premium Feature</h3>
                    <p>Upgrade to <strong>{requiredTier === 'super_premium' ? 'Super Premium' : 'Premium'}</strong> to unlock this feature.</p>
                    <Link href="/pricing" className={styles.upgradeBtn}>
                        View Plans
                    </Link>
                </div>
            </div>
        </div>
    )
}
