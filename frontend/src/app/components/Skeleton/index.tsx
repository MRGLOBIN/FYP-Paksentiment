'use client'

import styles from './Skeleton.module.scss'

interface SkeletonProps {
    width?: string
    height?: string
    borderRadius?: string
    className?: string
}

/** Pulsing skeleton placeholder — use instead of "Loading..." text */
export function Skeleton({ width = '100%', height = '1rem', borderRadius = 'var(--radius-md)', className }: SkeletonProps) {
    return (
        <div
            className={`${styles.skeleton} ${className || ''}`}
            style={{ width, height, borderRadius }}
        />
    )
}

/** Skeleton for a stat card (number + label) */
export function SkeletonStatCard() {
    return (
        <div className={styles.statCard}>
            <Skeleton width="60%" height="0.75rem" />
            <Skeleton width="40%" height="2rem" />
        </div>
    )
}

/** Skeleton for a session card */
export function SkeletonSessionCard() {
    return (
        <div className={styles.sessionCard}>
            <Skeleton width="70%" height="1rem" />
            <div className={styles.sessionMeta}>
                <Skeleton width="4rem" height="0.75rem" borderRadius="var(--radius-full)" />
                <Skeleton width="3rem" height="0.75rem" />
            </div>
        </div>
    )
}

/** Skeleton for a donut chart */
export function SkeletonDonut() {
    return (
        <div className={styles.donut}>
            <div className={styles.donutRing} />
        </div>
    )
}
