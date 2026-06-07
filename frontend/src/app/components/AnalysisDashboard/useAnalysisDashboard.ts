import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AnalysisResult, Post } from '../../../types'

// Setup constants
export const COLORS = {
    primary: 'var(--primary)',
    secondary: 'var(--primary-dark)',
    accent: 'var(--primary-hover)',
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280',
    background: 'var(--background)',
    cardBg: 'var(--card-bg)',
    text: 'var(--foreground)',
    textMuted: 'var(--text-muted)',
    border: 'var(--border-color)'
}

export const TOPIC_COLORS: Record<string, string> = {
    politics: '#118DFF',
    economy: '#10b981',
    sports: '#F2C811',
    entertainment: '#E044A7',
    technology: '#8B5CF6',
    crime: '#EF4444',
    education: '#0EA5E9',
    environment: '#14B8A6',
    health: '#F97316',
    society: '#8884D8',
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280'
}

export const EMOTION_COLORS: Record<string, string> = {
    joy: '#FBBF24',
    anger: '#EF4444',
    fear: '#8B5CF6',
    surprise: '#F97316',
    sadness: '#3B82F6',
    disgust: '#84CC16',
    trust: '#10B981',
    anticipation: '#EC4899'
}

export const TOPIC_COLOR_MAP: Record<string, string> = {
    economics: '#F59E0B', politics: '#EF4444', technology: '#8B5CF6',
    health: '#F97316', education: '#0EA5E9', sports: '#10B981',
    science: '#6366F1', culture: '#EC4899', environment: '#14B8A6',
    law: '#A855F7', general: '#6B7280', society: '#8884D8',
}

// Helper methods 
export const getSafeString = (val: any, defaultStr = '—'): string => {
    if (!val) return defaultStr;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'object') {
        if (typeof val.label === 'string') return val.label;
        if (typeof val.sentiment === 'string') return val.sentiment;
        if (typeof val.topic === 'string') return val.topic;
        if (typeof val.value === 'string') return val.value;
        if (typeof val.summary === 'string') return val.summary;
        return defaultStr;
    }
    return String(val)
}

export const getSentimentString = (val: any): string => {
    const s = getSafeString(val, 'Neutral').trim();
    if (s === '—') return 'Neutral';
    const lower = s.toLowerCase();
    if (lower.includes('positive')) return 'Positive';
    if (lower.includes('negative')) return 'Negative';
    if (lower.includes('neutral')) return 'Neutral';

    if (s.length > 20 || s.includes(' ')) {
        return 'Neutral';
    }
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const getConfidenceValue = (val: any, defaultConf = 0.8): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && typeof val.score === 'number') return val.score;
    if (val && typeof val === 'object' && typeof val.confidence === 'number') return val.confidence;
    return defaultConf;
}

export const sanitizeTopic = (raw: any): string => {
    let t = getSafeString(raw, 'General').trim();
    if (t === '—') return t;
    if (t.length > 25 || t.includes(' ') || t.includes('http') || t.includes('[')) {
        const match = t.match(/[a-zA-Z]{3,}/);
        t = match ? match[0] : 'General';
    }
    t = t.substring(0, 15);
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export const getSafeDateStr = (timestamp?: any, created_utc?: any, rawDate?: any): string => {
    try {
        if (timestamp) {
            const d = new Date(timestamp);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        if (created_utc) {
            const parsedUtc = Number(created_utc);
            if (!isNaN(parsedUtc)) {
                const ms = parsedUtc > 1e11 ? parsedUtc : parsedUtc * 1000;
                const d = new Date(ms);
                if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            }
        }
        if (rawDate) {
            const dStr = rawDate.toString();
            if (dStr.length >= 8 && /^\d+$/.test(dStr.slice(0, 8))) {
                return `${dStr.slice(0, 4)}-${dStr.slice(4, 6)}-${dStr.slice(6, 8)}`;
            }
        }
    } catch (e) {
        // ignore
    }
    return 'Unknown';
}

export const getSafeLocaleDateStr = (timestamp?: any, created_utc?: any): string => {
    try {
        if (timestamp) {
            const d = new Date(timestamp);
            if (!isNaN(d.getTime())) return d.toLocaleString();
        }
        if (created_utc) {
            const parsedUtc = Number(created_utc);
            if (!isNaN(parsedUtc)) {
                const ms = parsedUtc > 1e11 ? parsedUtc : parsedUtc * 1000;
                const d = new Date(ms);
                if (!isNaN(d.getTime())) return d.toLocaleString();
            }
        }
    } catch (e) {
        // ignore
    }
    return 'N/A';
}

export const shortenAuthorName = (author: any): string => {
    const raw = getSafeString(author, '—');
    if (raw === '—') return raw;
    try {
        if (raw.startsWith('http') || raw.includes('www.')) {
            const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
            let hostname = url.hostname.replace(/^www\./, '');
            hostname = hostname.split('.').slice(0, -1).join('.') || hostname;
            return hostname;
        }
    } catch (e) {}
    
    if (raw.length > 25) return raw.substring(0, 22) + '...';
    return raw;
}

export const useAnalysisDashboard = (data: AnalysisResult) => {
    const [selectedPost, setSelectedPost] = useState<Post | null>(null)
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)

    // ============ EXPORT HANDLERS ============
    const getExportData = () => {
        return data.posts?.map((post) => {
            const sentimentObj = data.sentiment?.find(s => s.id === post.id)
            const rawSentiment = post.sentiment || sentimentObj?.sentiment

            return {
                Date: getSafeLocaleDateStr(post.timestamp, post.created_utc),
                'User Name': post.author || 'Unknown',
                Source: post.url?.includes('reddit') ? 'Reddit' : (post.url?.includes('youtube') ? 'YouTube' : (post.url?.includes('twitter') ? 'Twitter' : 'Web')),
                Content: (post.text || post.content || post.title || '').replace(/[\n\r]+/g, ' ').substring(0, 500),
                Sentiment: getSentimentString(rawSentiment),
                'Context/Topic': sentimentObj?.summary || 'N/A',
                Confidence: ((post.confidence || sentimentObj?.confidence || getConfidenceValue(rawSentiment, 0)) * 100).toFixed(1) + '%',
                URL: post.url || 'N/A'
            }
        }) || []
    }

    const handleExportCSV = () => {
        const rows = getExportData()
        if (rows.length === 0) return

        const headers = Object.keys(rows[0])
        const csvContent = [
            headers.join(','),
            ...rows.map(row => headers.map(header => JSON.stringify(row[header as keyof typeof row] || '')).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `paksentiment_analysis_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setExportAnchorEl(null)
    }

    const handleExportPDF = () => {
        const rows = getExportData()
        if (rows.length === 0) return

        const doc = new jsPDF()

        // Header
        doc.setFontSize(18)
        doc.text('DataInsight Analysis Report', 14, 20)

        doc.setFontSize(11)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
        doc.text(`Source: ${data.source?.toUpperCase() || 'MIXED'} | Documents: ${data.count || 0}`, 14, 36)

        // Table
        const columns = ['Date', 'Source', 'User Name', 'Content', 'Sentiment', 'Context/Topic']
        const tableData = rows.map(r => [
            r.Date,
            r.Source,
            r['User Name'],
            r.Content.substring(0, 50) + (r.Content.length > 50 ? '...' : ''),
            r.Sentiment,
            r['Context/Topic']
        ])

        autoTable(doc, {
            head: [columns],
            body: tableData,
            startY: 45,
            theme: 'grid',
            styles: { fontSize: 8, overflow: 'linebreak' },
            columnStyles: {
                3: { cellWidth: 50 }, // Content
                5: { cellWidth: 40 }  // Topic
            },
            headStyles: { fillColor: [5, 150, 105] } // Primary Green
        })

        doc.save(`datainsight_report_${new Date().toISOString().slice(0, 10)}.pdf`)
        setExportAnchorEl(null)
    }

    // ============ KPI CALCULATIONS ============
    const hasSentiment = useMemo(() =>
        (data.sentiment && data.sentiment.length > 0) ||
        (data.posts && data.posts.some(p => !!p.sentiment)),
        [data]
    )

    const kpis = useMemo(() => {
        const totalDocs = data.count || data.posts?.length || 0
        const uniqueAuthors = new Set(data.posts?.map(p => p.author).filter(Boolean)).size

        const sentimentSource = (data.sentiment || data.posts?.filter(p => p.sentiment).map(p => ({
            id: p.id || '',
            sentiment: p.sentiment,
            confidence: p.confidence,
            summary: ''
        })) || []).map(s => ({
            id: s.id,
            sentiment: getSentimentString(s.sentiment),
            confidence: s.confidence ?? getConfidenceValue(s.sentiment),
            summary: s.summary
        }))

        const topicCounts = sentimentSource.reduce((acc, curr) => {
            acc[curr.sentiment] = (acc[curr.sentiment] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const topTopicItems = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
        const topTopic = topTopicItems.length > 0 ? topTopicItems[0] : null;

        const avgConfidence = sentimentSource.length > 0
            ? sentimentSource.reduce((sum, s) => sum + (s.confidence || 0), 0) / sentimentSource.length
            : 0

        return {
            totalDocs,
            uniqueAuthors,
            topTopic: topTopic ? topTopic[0] : 'N/A',
            topTopicCount: topTopic ? topTopic[1] : 0,
            topTopicPercent: topTopic && totalDocs > 0 ? ((topTopic[1] / totalDocs) * 100).toFixed(1) : '0',
            avgConfidence: (avgConfidence * 100).toFixed(1),
            topicCounts,
            sentimentSource
        }
    }, [data])

    // ============ CHART DATA ============
    const topicChartData = useMemo(() =>
        Object.entries(kpis.topicCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: TOPIC_COLORS[name.toLowerCase()] || COLORS.primary
        })),
        [kpis.topicCounts]
    )

    const sourceData = useMemo(() => {
        const sources: Record<string, number> = {}
        data.posts?.forEach(p => {
            let source = 'Unknown'
            if (p.url?.includes('reddit.com')) source = 'Reddit'
            else if (p.url?.includes('youtube.com')) source = 'YouTube'
            else if (p.author?.includes('.')) source = p.author.split('.')[0]
            else if (data.source) source = data.source
            sources[source] = (sources[source] || 0) + 1
        })
        return Object.entries(sources).map(([name, size]) => ({
            name,
            size,
            fill: name === 'Reddit' ? '#FF4500' :
                name === 'YouTube' ? '#FF0000' :
                    COLORS.primary
        }))
    }, [data])

    const timelineData = useMemo(() => {
        const dateMap: Record<string, number> = {}
        data.posts?.forEach(p => {
            const dateStr = getSafeDateStr(p.timestamp, p.created_utc, p.date);
            if (dateStr !== 'Unknown') {
                dateMap[dateStr] = (dateMap[dateStr] || 0) + 1
            }
        })
        return Object.entries(dateMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({ date, count }))
    }, [data])

    const confidenceData = useMemo(() => {
        const buckets = { '0-20%': 0, '20-40%': 0, '40-60%': 0, '60-80%': 0, '80-100%': 0 }
        kpis.sentimentSource.forEach(s => {
            const conf = (s.confidence || 0) * 100
            if (conf <= 20) buckets['0-20%']++
            else if (conf <= 40) buckets['20-40%']++
            else if (conf <= 60) buckets['40-60%']++
            else if (conf <= 80) buckets['60-80%']++
            else buckets['80-100%']++
        })
        return Object.entries(buckets).map(([range, count]) => ({ range, count }))
    }, [kpis.sentimentSource])

    const realTopicCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        const sentiments = data.sentiment || []
        sentiments.forEach((s: any) => {
            const topic = sanitizeTopic(s.topic)
            counts[topic] = (counts[topic] || 0) + 1
        })
        return counts
    }, [data.sentiment])

    const realTopicChartData = useMemo(() => {
        const sorted = Object.entries(realTopicCounts)
            .map(([name, value]) => ({
                name,
                value,
                color: TOPIC_COLOR_MAP[name.toLowerCase()] || COLORS.primary
            }))
            .sort((a, b) => b.value - a.value);

        if (sorted.length > 6) {
            const top5 = sorted.slice(0, 5);
            const others = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
            top5.push({ name: 'Other', value: others, color: '#9CA3AF' });
            return top5;
        }
        return sorted;
    }, [realTopicCounts])

    const uniqueTopicCount = Object.keys(realTopicCounts).length

    // ============ NEW: EMOTION DISTRIBUTION ============
    const emotionChartData = useMemo(() => {
        const counts: Record<string, number> = {}
        const sentiments = data.sentiment || []
        sentiments.forEach((s: any) => {
            const emotion = (s.emotion || 'Trust').trim()
            counts[emotion] = (counts[emotion] || 0) + 1
        })
        // Also check posts directly
        data.posts?.forEach(p => {
            if (p.emotion && !data.sentiment?.find(s => s.id === p.id)) {
                const emotion = p.emotion.trim()
                counts[emotion] = (counts[emotion] || 0) + 1
            }
        })
        return Object.entries(counts).map(([name, value]) => ({
            name,
            value,
            color: EMOTION_COLORS[name.toLowerCase()] || '#6B7280'
        })).sort((a, b) => b.value - a.value)
    }, [data])

    const topEmotion = emotionChartData.length > 0 ? emotionChartData[0].name : 'N/A'

    // ============ NEW: KEYWORD FREQUENCY ============
    const keywordData = useMemo(() => {
        const freq: Record<string, number> = {}
        const sentiments = data.sentiment || []
        sentiments.forEach((s: any) => {
            if (Array.isArray(s.keywords)) {
                s.keywords.forEach((kw: string) => {
                    const normalized = kw.toLowerCase().trim()
                    if (normalized.length > 1) {
                        freq[normalized] = (freq[normalized] || 0) + 1
                    }
                })
            }
        })
        data.posts?.forEach(p => {
            if (Array.isArray(p.keywords) && !data.sentiment?.find(s => s.id === p.id)) {
                p.keywords.forEach((kw: string) => {
                    const normalized = kw.toLowerCase().trim()
                    if (normalized.length > 1) {
                        freq[normalized] = (freq[normalized] || 0) + 1
                    }
                })
            }
        })
        return Object.entries(freq)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 30)
    }, [data])

    // ============ NEW: LANGUAGE DISTRIBUTION ============
    const languageData = useMemo(() => {
        const counts: Record<string, number> = {}
        const sentiments = data.sentiment || []
        sentiments.forEach((s: any) => {
            const lang = (s.language || 'en').toUpperCase()
            counts[lang] = (counts[lang] || 0) + 1
        })
        data.posts?.forEach(p => {
            if (p.language && !data.sentiment?.find(s => s.id === p.id)) {
                const lang = p.language.toUpperCase()
                counts[lang] = (counts[lang] || 0) + 1
            }
        })
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
    }, [data])

    // ============ NEW: SOURCE MIX ============
    const sourceMixData = useMemo(() => {
        const counts: Record<string, number> = {}
        data.posts?.forEach(p => {
            let src = 'Web'
            const url = p.url || ''
            const metaSource = ((p.metadata as any)?.source || '').toLowerCase()

            if (url.includes('reddit.com') || p.subreddit) src = 'Reddit'
            else if (url.includes('youtube.com')) src = 'YouTube'
            else if (url.includes('twitter.com') || url.includes('x.com')) src = 'Twitter'
            else if (url.includes('news.ycombinator.com') || metaSource === 'hackernews') src = 'Hacker News'
            else if (url.includes('stackoverflow.com') || metaSource === 'stackoverflow') src = 'Stack Overflow'
            else if (url.includes('mastodon') || metaSource === 'mastodon') src = 'Mastodon'
            else if (metaSource === 'newsapi') src = 'NewsAPI'
            else if (metaSource === 'newsdata') src = 'NewsData'
            else if (metaSource === 'gdelt') src = 'GDELT'
            else if (metaSource === 'googletrends' || url.includes('trends.google.com')) src = 'Google Trends'
            else if (metaSource === 'rss') src = 'RSS'
            else if (metaSource === 'commoncrawl' || data.source === 'commoncrawl') src = 'CommonCrawl'
            else if (data.source) {
                // Fallback: use the top-level data.source if set
                src = data.source.charAt(0).toUpperCase() + data.source.slice(1)
            }
            counts[src] = (counts[src] || 0) + 1
        })
        const sourceColors: Record<string, string> = {
            Reddit: '#FF4500', YouTube: '#FF0000', Twitter: '#1DA1F2',
            CommonCrawl: '#8B5CF6', Web: '#10B981',
            'Hacker News': '#FF6600', 'Stack Overflow': '#f97316',
            Mastodon: '#6364FF', NewsAPI: '#0ea5e9', NewsData: '#3b82f6',
            GDELT: '#6366f1', 'Google Trends': '#4285F4', RSS: '#f59e0b',
        }
        return Object.entries(counts).map(([name, value]) => ({
            name, value, color: sourceColors[name] || '#6B7280'
        }))
    }, [data])

    // ============ NEW: ENGAGEMENT SCORE ============
    const engagementStats = useMemo(() => {
        let totalScore = 0, totalComments = 0, count = 0
        data.posts?.forEach(p => {
            if (p.score != null) { totalScore += p.score; count++ }
            if (p.num_comments != null) totalComments += p.num_comments
        })
        return {
            avgScore: count > 0 ? Math.round(totalScore / count) : 0,
            totalComments,
            hasEngagement: count > 0
        }
    }, [data])

    // Table Data
    const tableRows = useMemo(() => {
        return data.posts?.map((post, idx) => {
            const sentimentObj = data.sentiment?.find(s => s.id === post.id)
            const rawSentimentValue = sentimentObj?.sentiment || post.sentiment;

            let safeSummary = getSafeString(sentimentObj?.summary, '');
            if (!safeSummary) {
                safeSummary = getSafeString(post.title, '');
                if (!safeSummary) {
                    safeSummary = getSafeString(post.text || post.content, '').substring(0, 200) + '...';
                }
            }

            return {
                id: post.id || idx,
                source: getSafeString(post.author, 'Unknown'),
                topic: sanitizeTopic(sentimentObj?.topic),
                summary: safeSummary,
                sentiment: getSafeString(rawSentimentValue, '—'),
                confidence: sentimentObj?.confidence ?? post.confidence ?? getConfidenceValue(rawSentimentValue, 0),
                keywords: (sentimentObj?.keywords || post.keywords || []) as string[],
                language: getSafeString(sentimentObj?.language || post.language, '—').toUpperCase(),
                relevance: (sentimentObj?.relevance ?? post.relevance ?? 0) as number,
                author: shortenAuthorName(post.author),
                date: getSafeDateStr(post.timestamp, post.created_utc, post.date),
                fullPost: post
            }
        }) || []
    }, [data])

    // ============ PHASE 1: NET SENTIMENT SCORE ============
    const netSentimentScore = useMemo(() => {
        const sentiments = kpis.sentimentSource
        if (sentiments.length === 0) return 0
        let pos = 0, neg = 0
        sentiments.forEach(s => {
            const sl = s.sentiment.toLowerCase()
            if (sl.includes('positive')) pos++
            else if (sl.includes('negative')) neg++
        })
        return Math.round(((pos - neg) / sentiments.length) * 100)
    }, [kpis.sentimentSource])

    // ============ PHASE 1: SENTIMENT OVER TIME (stacked) ============
    const sentimentTimelineData = useMemo(() => {
        const dateMap: Record<string, { date: string, Positive: number, Negative: number, Neutral: number }> = {}
        data.posts?.forEach(p => {
            const dateStr = getSafeDateStr(p.timestamp, p.created_utc, p.date)
            if (dateStr === 'Unknown') return
            if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr, Positive: 0, Negative: 0, Neutral: 0 }
            const sentimentObj = data.sentiment?.find(s => s.id === p.id)
            const sent = getSentimentString(sentimentObj?.sentiment || p.sentiment)
            if (sent === 'Positive') dateMap[dateStr].Positive++
            else if (sent === 'Negative') dateMap[dateStr].Negative++
            else dateMap[dateStr].Neutral++
        })
        return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
    }, [data])

    // ============ PHASE 1: TOP AUTHORS ============
    const topAuthorsData = useMemo(() => {
        const counts: Record<string, { posts: number, totalScore: number }> = {}
        data.posts?.forEach(p => {
            const author = p.author || 'Unknown'
            if (author === 'Unknown' || author === '—') return
            if (!counts[author]) counts[author] = { posts: 0, totalScore: 0 }
            counts[author].posts++
            counts[author].totalScore += (p.score || 0)
        })
        return Object.entries(counts)
            .map(([name, val]) => ({ name, posts: val.posts, score: val.totalScore }))
            .sort((a, b) => b.posts - a.posts || b.score - a.score)
            .slice(0, 10)
    }, [data])

    // ============ PHASE 1: CONTENT LENGTH DISTRIBUTION ============
    const contentLengthData = useMemo(() => {
        const buckets = [
            { range: '0-50', min: 0, max: 50, count: 0 },
            { range: '50-100', min: 50, max: 100, count: 0 },
            { range: '100-200', min: 100, max: 200, count: 0 },
            { range: '200-500', min: 200, max: 500, count: 0 },
            { range: '500-1k', min: 500, max: 1000, count: 0 },
            { range: '1k+', min: 1000, max: Infinity, count: 0 },
        ]
        data.posts?.forEach(p => {
            const text = p.text || p.content || p.title || ''
            const wordCount = text.split(/\s+/).filter(Boolean).length
            const bucket = buckets.find(b => wordCount >= b.min && wordCount < b.max)
            if (bucket) bucket.count++
        })
        return buckets.map(b => ({ range: b.range, count: b.count }))
    }, [data])

    // ============ PHASE 1: PEAK HOURS HEATMAP ============
    const peakHoursData = useMemo(() => {
        const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        data.posts?.forEach(p => {
            let d: Date | null = null
            if (p.timestamp) d = new Date(p.timestamp)
            else if (p.created_utc) {
                const utc = Number(p.created_utc)
                if (!isNaN(utc)) d = new Date(utc > 1e11 ? utc : utc * 1000)
            }
            if (d && !isNaN(d.getTime())) {
                grid[d.getDay()][d.getHours()]++
            }
        })
        const result: { day: string, hour: number, count: number }[] = []
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            for (let hour = 0; hour < 24; hour++) {
                if (grid[dayIdx][hour] > 0) {
                    result.push({ day: dayNames[dayIdx], hour, count: grid[dayIdx][hour] })
                }
            }
        }
        return result
    }, [data])

    // ============ MEDIA GALLERY DATA ============
    const mediaItems = useMemo(() => {
        const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/raw-data.*$/, '').replace(/\/api\/v1\/?$/, '') || 'http://localhost:3000';

        const formatMediaUrl = (url: string) => {
            if (!url) return url;
            // Backend sends relative proxy paths like /proxy/image?url=...
            if (url.startsWith('/proxy/')) return `${apiBase}${url}`;
            return url;
        };

        // Use standardized media array from backend if available
        if ((data as any).media && Array.isArray((data as any).media) && (data as any).media.length > 0) {
            return (data as any).media.map((m: any) => ({ ...m, mediaUrl: formatMediaUrl(m.mediaUrl) }));
        }

        const items: {
            id: string
            type: 'image' | 'video'
            mediaUrl: string
            title: string
            source: string
            sourceUrl: string
            query: string
            date: string
        }[] = []

        data.posts?.forEach((post, idx) => {
            const postId = post.id || String(idx)
            const title = post.title || 'Untitled'
            const sourceUrl = post.url || ''
            const date = getSafeDateStr(post.timestamp, post.created_utc, post.date)

            // Determine source label
            let source = data.source || 'Web'
            if (sourceUrl.includes('reddit.com')) source = 'Reddit'
            else if (sourceUrl.includes('youtube.com')) source = 'YouTube'
            else if (sourceUrl.includes('news.ycombinator.com')) source = 'Hacker News'
            else if (sourceUrl.includes('stackoverflow.com')) source = 'Stack Overflow'
            else if (post.author?.includes('.')) {
                try {
                    const urlObj = new URL(sourceUrl || `https://${post.author}`)
                    source = urlObj.hostname.replace(/^www\./, '')
                } catch { source = post.author }
            }

            // Direct image_url from API (NewsAPI, NewsData, Reddit, etc.)
            if (post.image_url) {
                // Decode any HTML entities that may have slipped through (e.g. &amp; -> &)
                const cleanImageUrl = post.image_url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
                items.push({
                    id: `${postId}-img`,
                    type: 'image',
                    mediaUrl: formatMediaUrl(`/proxy/image?url=${encodeURIComponent(cleanImageUrl)}`),
                    title,
                    source,
                    sourceUrl,
                    query: data.source || '',
                    date,
                })
            }

            // Direct video_url from API
            if (post.video_url) {
                items.push({
                    id: `${postId}-vid`,
                    type: 'video',
                    mediaUrl: post.video_url,
                    title,
                    source,
                    sourceUrl,
                    query: data.source || '',
                    date,
                })
            }
            
            // Fallback: check if the source URL itself is a direct image link
            if (!post.image_url && !post.video_url && sourceUrl) {
                const lowerUrl = sourceUrl.toLowerCase();
                if (
                    lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/) ||
                    lowerUrl.includes('i.redd.it') ||
                    lowerUrl.includes('preview.redd.it') ||
                    lowerUrl.includes('imgur.com')
                ) {
                    const isImgurGallery = lowerUrl.includes('imgur.com/a/') || lowerUrl.includes('imgur.com/gallery/');
                    if (!isImgurGallery) {
                        let finalUrl = sourceUrl.replace(/&amp;/g, '&');
                        if (lowerUrl.includes('imgur.com') && !lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/)) {
                            finalUrl = `${finalUrl}.jpg`;
                        }
                        items.push({
                            id: `${postId}-fallback-img`,
                            type: 'image',
                            mediaUrl: formatMediaUrl(`/proxy/image?url=${encodeURIComponent(finalUrl)}`),
                            title,
                            source,
                            sourceUrl,
                            query: data.source || '',
                            date,
                        })
                    }
                }
            }

            // YouTube embeds: extract video ID from URL
            if (sourceUrl.includes('youtube.com/watch')) {
                try {
                    const urlObj = new URL(sourceUrl)
                    const videoId = urlObj.searchParams.get('v')
                    if (videoId) {
                        // Add thumbnail
                        items.push({
                            id: `${postId}-yt-thumb`,
                            type: 'image',
                            mediaUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                            title,
                            source: 'YouTube',
                            sourceUrl,
                            query: data.source || '',
                            date,
                        })
                    }
                } catch {}
            }
        })

        return items
    }, [data])

    return {
        selectedPost, setSelectedPost,
        exportAnchorEl, setExportAnchorEl,
        handleExportCSV, handleExportPDF,
        hasSentiment, kpis, topicChartData,
        sourceData, timelineData, confidenceData,
        realTopicChartData, uniqueTopicCount,
        emotionChartData, topEmotion,
        keywordData, languageData,
        sourceMixData, engagementStats,
        netSentimentScore, sentimentTimelineData,
        topAuthorsData, contentLengthData, peakHoursData,
        tableRows, mediaItems
    }
}
