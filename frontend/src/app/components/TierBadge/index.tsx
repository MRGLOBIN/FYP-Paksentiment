'use client'

import React from 'react'
import styles from './TierBadge.module.scss'

interface TierBadgeProps {
    tier: 'free' | 'premium' | 'super_premium'
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export default function TierBadge({ tier, size = 'sm', className = '' }: TierBadgeProps) {
    const label = tier === 'super_premium' ? 'Super Premium' : tier === 'premium' ? 'Premium' : 'Free'
    const tierClass = styles[tier] || styles.free
    const sizeClass = styles[`size-${size}`]

    return (
        <span className={`${styles.badge} ${tierClass} ${sizeClass} ${className}`}>
            {label}
        </span>
    )
}
