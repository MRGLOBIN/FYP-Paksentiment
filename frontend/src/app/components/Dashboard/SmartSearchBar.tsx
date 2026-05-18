'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, AutoAwesome } from '@mui/icons-material'
import styles from './SmartSearchBar.module.scss'

export default function SmartSearchBar() {
    const [query, setQuery] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const router = useRouter()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            router.push(`/analytics?source=ai&query=${encodeURIComponent(query)}`)
        }
    }

    return (
        <div className={`${styles.searchWrapper} ${isFocused ? styles.focused : ''}`}>
            <form onSubmit={handleSubmit} className={styles.searchForm}>
                <div className={styles.inputContainer}>
                    <AutoAwesome className={styles.aiIcon} />
                    <input
                        type="text"
                        placeholder="What's the public opinion on..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={styles.input}
                    />
                    <button type="submit" className={styles.submitBtn} disabled={!query.trim()}>
                        <Search />
                    </button>
                </div>
            </form>
            <div className={styles.glow} />
        </div>
    )
}
