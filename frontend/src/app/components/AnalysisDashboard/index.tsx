'use client'

import React from 'react'
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import { DataGrid } from '@mui/x-data-grid'
import {
    BarChart as BarChartIcon,
    Label,
    ListAlt,
    Close as CloseIcon,
    Visibility as VisibilityIcon,
    Download as DownloadIcon,
    TrendingUp,
    Image as ImageIcon,
    PlayCircleOutline as VideoIcon,
    OpenInNew as OpenInNewIcon,
    FlashOn as FlashOnIcon,
    Assessment as AssessmentIcon,
    LibraryBooks as LibraryBooksIcon,
    VpnKey as VpnKeyIcon,
    SettingsInputAntenna as SettingsInputAntennaIcon,
    Language as LanguageIcon,
    Person as PersonIcon,
    Description as DescriptionIcon,
    AccessTime as AccessTimeIcon
} from '@mui/icons-material'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography,
    Button,
    Box,
    Chip,
    Stack,
    Menu,
    MenuItem,
    Tabs,
    Tab
} from '@mui/material'
import styles from './AnalysisDashboard.module.scss'
import { AnalysisResult } from '../../../types'
import {
    COLORS,
    TOPIC_COLORS,
    EMOTION_COLORS,
    useAnalysisDashboard,
    getSentimentString
} from './useAnalysisDashboard'

interface AnalysisDashboardProps {
    data: AnalysisResult
}

export default function AnalysisDashboard({ data }: AnalysisDashboardProps) {
    const {
        selectedPost, setSelectedPost,
        exportAnchorEl, setExportAnchorEl,
        handleExportCSV, handleExportPDF,
        hasSentiment, kpis, topicChartData,
        timelineData, confidenceData,
        realTopicChartData, uniqueTopicCount,
        emotionChartData, topEmotion,
        keywordData, languageData,
        sourceMixData, engagementStats,
        netSentimentScore, sentimentTimelineData,
        topAuthorsData, contentLengthData, peakHoursData,
        tableRows, mediaItems
    } = useAnalysisDashboard(data)

    const [activeTab, setActiveTab] = React.useState(0)

    // ============ RENDER ============
    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Analysis Dashboard</h1>
                <span className={styles.subtitle}>
                    Source: <strong>{data.source?.toUpperCase() || 'MIXED'}</strong> |
                    {data.count} documents analyzed
                </span>

                <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={(event) => setExportAnchorEl(event.currentTarget)}
                        sx={{ color: COLORS.primary, borderColor: COLORS.primary }}
                    >
                        Export Data
                    </Button>
                    <Menu
                        anchorEl={exportAnchorEl}
                        open={Boolean(exportAnchorEl)}
                        onClose={() => setExportAnchorEl(null)}
                    >
                        <MenuItem onClick={handleExportCSV}>Export as CSV</MenuItem>
                        <MenuItem onClick={handleExportPDF}>Export as PDF</MenuItem>
                    </Menu>
                </Box>
            </div>

            {/* KPI Cards */}
            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiIcon}>
                        <BarChartIcon fontSize="inherit" />
                    </span>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiValue}>{kpis.totalDocs.toLocaleString()}</span>
                        <span className={styles.kpiTitle}>Total Documents</span>
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <span className={styles.kpiIcon}><FlashOnIcon fontSize="inherit" /></span>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiValue} style={{
                            color: netSentimentScore > 20 ? '#10b981' : netSentimentScore < -20 ? '#ef4444' : '#f59e0b'
                        }}>
                            {netSentimentScore > 0 ? '+' : ''}{netSentimentScore}
                        </span>
                        <span className={styles.kpiTitle}>Net Sentiment (-100 to +100)</span>
                    </div>
                </div>


                {hasSentiment && (
                    <>
                        <div className={styles.kpiCard}>
                            <span className={styles.kpiIcon}>
                                <Label fontSize="inherit" />
                            </span>
                            <div className={styles.kpiContent}>
                                <span className={styles.kpiValue} style={{ color: TOPIC_COLORS[kpis.topTopic.toLowerCase()] || COLORS.primary }}>
                                    {kpis.topTopic}
                                </span>
                                <span className={styles.kpiTitle}>Top Sentiment ({kpis.topTopicPercent}%)</span>
                            </div>
                        </div>

                        <div className={styles.kpiCard}>
                            <span className={styles.kpiIcon}>
                                <TrendingUp fontSize="inherit" />
                            </span>
                            <div className={styles.kpiContent}>
                                <span className={styles.kpiValue} style={{ color: COLORS.primary }}>
                                    {uniqueTopicCount}
                                </span>
                                <span className={styles.kpiTitle}>Unique Topics</span>
                            </div>
                        </div>

                        <div className={styles.kpiCard}>
                            <span className={styles.kpiIcon}><AssessmentIcon fontSize="inherit" /></span>
                            <div className={styles.kpiContent}>
                                <span className={styles.kpiValue} style={{ color: COLORS.primary }}>
                                    {kpis.avgConfidence}%
                                </span>
                                <span className={styles.kpiTitle}>Avg Confidence</span>
                            </div>
                        </div>

                    </>
                )}
            </div>

            {/* Data Table — shown first, above charts */}
            <div className={styles.dataGridSection}>
                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onChange={(_, newVal) => setActiveTab(newVal)}
                    sx={{
                        mb: 2,
                        '& .MuiTabs-indicator': { backgroundColor: COLORS.primary, height: 3, borderRadius: 2 },
                        '& .MuiTab-root': {
                            color: COLORS.textMuted,
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            textTransform: 'none',
                            '&.Mui-selected': { color: COLORS.primary },
                        },
                    }}
                >
                    <Tab icon={<ListAlt fontSize="small" />} iconPosition="start" label={`Analysis Data (${data.posts?.length || 0})`} />
                    <Tab icon={<BarChartIcon fontSize="small" />} iconPosition="start" label="Graphs" />
                    <Tab icon={<ImageIcon fontSize="small" />} iconPosition="start" label={`Media Gallery (${mediaItems.length})`} />
                </Tabs>

                {/* Tab Panel: Analysis Data */}
                {activeTab === 0 && (
                    <>
                        <div className={styles.sectionHeader}>
                            <h3>
                                <ListAlt fontSize="inherit" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                Data Feed
                            </h3>
                            <span className={styles.recordCount}>{data.posts?.length || 0} records</span>
                        </div>
                <DataGrid
                    rows={tableRows}
                    columns={[
                        { field: 'source', headerName: 'SOURCE', flex: 0.8, minWidth: 120 },
                        {
                            field: 'topic',
                            headerName: 'TOPIC',
                            flex: 0.6,
                            minWidth: 100,
                            renderCell: (params) => (
                                <Chip
                                    label={params.value}
                                    size="small"
                                    sx={{
                                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                        color: '#a78bfa',
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                        letterSpacing: '0.03em',
                                    }}
                                />
                            )
                        },
                        { field: 'summary', headerName: 'SUMMARY', flex: 2.5, minWidth: 350 },
                        {
                            field: 'sentiment',
                            headerName: 'SENTIMENT',
                            flex: 0.7,
                            minWidth: 110,
                            renderCell: (params) => {
                                const val = String(params.value || '').toLowerCase()
                                const color = val.includes('positive') ? '#10b981'
                                    : val.includes('negative') ? '#ef4444'
                                        : '#6b7280'
                                return (
                                    <Chip
                                        label={params.value}
                                        size="small"
                                        sx={{
                                            backgroundColor: `${color}22`,
                                            color: color,
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                            letterSpacing: '0.03em',
                                            border: `1px solid ${color}44`,
                                        }}
                                    />
                                )
                            }
                        },
                        {
                            field: 'confidence',
                            headerName: 'CONFIDENCE',
                            flex: 0.6,
                            minWidth: 100,
                            renderCell: (params) => {
                                if (params.value == null) return '—'
                                const pct = Math.round(params.value * 100)
                                const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
                                return (
                                    <span style={{ color, fontWeight: 700, fontSize: '0.85rem' }}>
                                        {pct}%
                                    </span>
                                )
                            }
                        },

                        { field: 'author', headerName: 'AUTHOR', flex: 0.6, minWidth: 90 },
                        { field: 'date', headerName: 'DATE', flex: 0.7, minWidth: 100 },

                        {
                            field: 'actions',
                            headerName: 'ACTIONS',
                            width: 120,
                            renderCell: (params) => (
                                <Button
                                    startIcon={<VisibilityIcon />}
                                    size="small"
                                    onClick={() => {
                                        const original = data.posts?.find((p, i) => (p.id || i) === params.id)
                                        setSelectedPost(original || null)
                                    }}
                                    sx={{ color: COLORS.primary }}
                                >
                                    Details
                                </Button>
                            )
                        }
                    ]}
                    initialState={{
                        pagination: { paginationModel: { page: 0, pageSize: 25 } },
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    sx={{
                        border: 'none',
                        backgroundColor: COLORS.cardBg,
                        fontFamily: '"Inter", "Segoe UI", sans-serif',
                        '& .MuiDataGrid-columnHeader': {
                            backgroundColor: COLORS.secondary,
                            color: COLORS.text,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                        },
                        '& .MuiDataGrid-cell': {
                            borderBottom: `1px solid ${COLORS.border}`,
                            color: COLORS.text,
                            fontSize: '0.875rem',
                        },
                        '& .MuiDataGrid-row': {
                            backgroundColor: COLORS.cardBg,
                            '&:nth-of-type(even)': {
                                backgroundColor: 'rgba(255,255,255,0.02)'
                            },
                            '&:hover': {
                                backgroundColor: 'rgba(17, 141, 255, 0.1) !important'
                            },
                        },
                        '& .MuiDataGrid-footerContainer': {
                            backgroundColor: COLORS.cardBg,
                            borderTop: `1px solid ${COLORS.border}`,
                            color: COLORS.textMuted
                        },
                        '& .MuiTablePagination-root': { color: COLORS.textMuted },
                        '& .MuiIconButton-root': { color: COLORS.textMuted },
                        '& .MuiDataGrid-sortIcon': { color: COLORS.text },
                    }}
                    autoHeight
                    disableRowSelectionOnClick
                />
                    </>
                )}

                {/* Tab Panel: Media Gallery */}
                {activeTab === 2 && (
                    <div style={{ padding: '16px 0' }}>
                        {mediaItems.length === 0 ? (
                            <Box sx={{
                                textAlign: 'center', py: 8, color: COLORS.textMuted,
                                border: `2px dashed ${COLORS.border}`, borderRadius: 3,
                                backgroundColor: 'rgba(255,255,255,0.02)'
                            }}>
                                <ImageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                                <Typography variant="h6" sx={{ mb: 1, color: COLORS.textMuted }}>
                                    No Media Found
                                </Typography>
                                <Typography variant="body2" sx={{ color: COLORS.textMuted, opacity: 0.7 }}>
                                    Media will appear here when sources like NewsAPI or NewsData return images/videos.
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: 3,
                            }}>
                                {mediaItems.map((item: any) => (
                                    <Box
                                        key={item.id}
                                        sx={{
                                            borderRadius: 3,
                                            overflow: 'hidden',
                                            backgroundColor: COLORS.cardBg,
                                            border: `1px solid ${COLORS.border}`,
                                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                                            },
                                        }}
                                    >
                                        {/* Media */}
                                        <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#0a0a0a', overflow: 'hidden' }}>
                                            {item.type === 'image' ? (
                                                <img
                                                    src={item.mediaUrl}
                                                    alt={item.title}
                                                    style={{
                                                        position: 'absolute', top: 0, left: 0,
                                                        width: '100%', height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none'
                                                    }}
                                                />
                                            ) : (
                                                <video
                                                    src={item.mediaUrl}
                                                    controls
                                                    style={{
                                                        position: 'absolute', top: 0, left: 0,
                                                        width: '100%', height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                            )}
                                            {/* Type badge */}
                                            <Chip
                                                icon={item.type === 'image' ? <ImageIcon sx={{ fontSize: 14 }} /> : <VideoIcon sx={{ fontSize: 14 }} />}
                                                label={item.type.toUpperCase()}
                                                size="small"
                                                sx={{
                                                    position: 'absolute', top: 8, right: 8,
                                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                                    color: '#fff',
                                                    fontWeight: 700, fontSize: '0.65rem',
                                                    backdropFilter: 'blur(4px)',
                                                    '& .MuiChip-icon': { color: '#fff' },
                                                }}
                                            />
                                        </Box>

                                        {/* Info */}
                                        <Box sx={{ p: 2 }}>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    color: COLORS.text, fontWeight: 600,
                                                    mb: 1, lineHeight: 1.4,
                                                    display: '-webkit-box', WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                                }}
                                            >
                                                {item.title}
                                            </Typography>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                                <Chip
                                                    label={item.source}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: 'rgba(17, 141, 255, 0.12)',
                                                        color: COLORS.primary,
                                                        fontWeight: 600, fontSize: '0.7rem',
                                                    }}
                                                />
                                                <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                                                    {item.date}
                                                </Typography>
                                            </Stack>
                                            {item.sourceUrl && (
                                                <Button
                                                    size="small"
                                                    startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                                                    href={item.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    sx={{
                                                        color: COLORS.primary, textTransform: 'none',
                                                        fontSize: '0.75rem', p: 0,
                                                        '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' },
                                                    }}
                                                >
                                                    View Source
                                                </Button>
                                            )}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </div>
                )}
            </div>

            {/* Tab Panel: Graphs */}
            {activeTab === 1 && hasSentiment && (
                <div className={styles.chartsGrid}>
                    {/* Sentiment Distribution Donut - Full Width */}
                    <div className={`${styles.chartCard} ${styles.fullWidth}`}>
                        <h3 className={styles.chartTitle}>Sentiment Distribution</h3>
                        <ResponsiveContainer width="100%" height={450}>
                            <PieChart>
                                <Pie
                                    data={topicChartData}
                                    innerRadius={100}
                                    outerRadius={160}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => (percent ?? 0) > 0.03 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''}
                                    labelLine={true}
                                >
                                    {topicChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                    itemStyle={{ color: COLORS.text }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    wrapperStyle={{ color: COLORS.textMuted }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Volume by Sentiment (Bar) */}
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Volume by Sentiment</h3>
                        <ResponsiveContainer width="100%" height={380}>
                            <BarChart data={[...topicChartData].sort((a, b) => b.value - a.value).slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                <XAxis dataKey="name" stroke={COLORS.textMuted} tick={{ fontSize: 12 }} />
                                <YAxis stroke={COLORS.textMuted} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {topicChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Timeline */}
                    {timelineData.length > 1 && (
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>Content Over Time</h3>
                            <ResponsiveContainer width="100%" height={380}>
                                <AreaChart data={timelineData}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                    <XAxis dataKey="date" stroke={COLORS.textMuted} tick={{ fontSize: 10 }} />
                                    <YAxis stroke={COLORS.textMuted} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke={COLORS.primary}
                                        fill="url(#colorCount)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Confidence Distribution */}
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Confidence Distribution</h3>
                        <ResponsiveContainer width="100%" height={380}>
                            <BarChart data={confidenceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                <XAxis dataKey="range" stroke={COLORS.textMuted} tick={{ fontSize: 12 }} />
                                <YAxis stroke={COLORS.textMuted} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                />
                                <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Topic Distribution Donut */}
                    {realTopicChartData.length > 0 && (
                        <div className={`${styles.chartCard} ${styles.fullWidth}`}>
                            <h3 className={styles.chartTitle}><LibraryBooksIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Topic Distribution</h3>
                            <ResponsiveContainer width="100%" height={420}>
                                <PieChart>
                                    <Pie
                                        data={realTopicChartData}
                                        innerRadius={90}
                                        outerRadius={150}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, percent }) => (percent ?? 0) > 0.03 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''}
                                        labelLine={true}
                                    >
                                        {realTopicChartData.map((entry, index) => (
                                            <Cell key={`topic-cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                        itemStyle={{ color: COLORS.text }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        wrapperStyle={{ color: COLORS.textMuted }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}



                    {/* Keyword Frequency */}
                    {keywordData.length > 0 && (
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}><VpnKeyIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Top Keywords</h3>
                            <ResponsiveContainer width="100%" height={380}>
                                <BarChart data={keywordData.slice(0, 15)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                    <XAxis type="number" stroke={COLORS.textMuted} />
                                    <YAxis dataKey="word" type="category" stroke={COLORS.textMuted} tick={{ fontSize: 11 }} width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Source Mix */}
                    {sourceMixData.length > 0 && (
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}><SettingsInputAntennaIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Source Mix</h3>
                            <ResponsiveContainer width="100%" height={380}>
                                <BarChart data={sourceMixData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                    <XAxis dataKey="name" stroke={COLORS.textMuted} tick={{ fontSize: 12 }} />
                                    <YAxis stroke={COLORS.textMuted} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {sourceMixData.map((entry, index) => (
                                            <Cell key={`src-cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Language Distribution */}
                    {languageData.length > 0 && (
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}><LanguageIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Language Distribution</h3>
                            <ResponsiveContainer width="100%" height={380}>
                                <BarChart data={languageData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                    <XAxis dataKey="name" stroke={COLORS.textMuted} tick={{ fontSize: 12 }} />
                                    <YAxis stroke={COLORS.textMuted} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="value" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Sentiment Over Time (Stacked) */}
                    {sentimentTimelineData.length > 1 && (
                        <div className={`${styles.chartCard} ${styles.fullWidth}`}>
                            <h3 className={styles.chartTitle}><TrendingUp style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Sentiment Over Time</h3>
                            <ResponsiveContainer width="100%" height={380}>
                                <AreaChart data={sentimentTimelineData}>
                                    <defs>
                                        <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                        </linearGradient>
                                        <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                                        </linearGradient>
                                        <linearGradient id="colorNeu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6b7280" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#6b7280" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                    <XAxis dataKey="date" stroke={COLORS.textMuted} tick={{ fontSize: 10 }} />
                                    <YAxis stroke={COLORS.textMuted} />
                                    <Tooltip contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="Positive" stackId="1" stroke="#10b981" fill="url(#colorPos)" />
                                    <Area type="monotone" dataKey="Negative" stackId="1" stroke="#ef4444" fill="url(#colorNeg)" />
                                    <Area type="monotone" dataKey="Neutral" stackId="1" stroke="#6b7280" fill="url(#colorNeu)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Top Authors */}
                    {topAuthorsData.length > 0 && (
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}><PersonIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Top Authors</h3>
                            <ResponsiveContainer width="100%" height={380}>
                                <BarChart data={topAuthorsData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                    <XAxis type="number" stroke={COLORS.textMuted} />
                                    <YAxis dataKey="name" type="category" stroke={COLORS.textMuted} tick={{ fontSize: 11 }} width={120} />
                                    <Tooltip contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }} />
                                    <Bar dataKey="posts" fill="#118DFF" radius={[0, 4, 4, 0]} name="Posts" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Content Length Distribution */}
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}><DescriptionIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Content Length (words)</h3>
                        <ResponsiveContainer width="100%" height={380}>
                            <BarChart data={contentLengthData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                <XAxis dataKey="range" stroke={COLORS.textMuted} tick={{ fontSize: 12 }} />
                                <YAxis stroke={COLORS.textMuted} />
                                <Tooltip contentStyle={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }} />
                                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Peak Hours Heatmap */}
                    {peakHoursData.length > 0 && (
                        <div className={`${styles.chartCard} ${styles.fullWidth}`}>
                            <h3 className={styles.chartTitle}><AccessTimeIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Peak Activity Hours</h3>
                            <div style={{ padding: '16px', overflowX: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(24, 1fr)', gap: '2px', minWidth: '600px' }}>
                                    {/* Header row */}
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px' }}></div>
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <div key={`h-${i}`} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2px' }}>
                                            {i}h
                                        </div>
                                    ))}
                                    {/* Grid rows */}
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                                        const maxCount = Math.max(...peakHoursData.map(d => d.count), 1)
                                        return (
                                            <React.Fragment key={day}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}>{day}</div>
                                                {Array.from({ length: 24 }, (_, hour) => {
                                                    const cell = peakHoursData.find(d => d.day === day && d.hour === hour)
                                                    const count = cell?.count || 0
                                                    const opacity = count > 0 ? 0.2 + (count / maxCount) * 0.8 : 0.05
                                                    return (
                                                        <div key={`${day}-${hour}`} title={`${day} ${hour}:00 — ${count} posts`} style={{
                                                            backgroundColor: `rgba(16, 185, 129, ${opacity})`,
                                                            borderRadius: '3px',
                                                            minHeight: '24px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.6rem',
                                                            color: count > 0 ? '#10b981' : 'transparent',
                                                            cursor: 'default'
                                                        }}>
                                                            {count > 0 ? count : ''}
                                                        </div>
                                                    )
                                                })}
                                            </React.Fragment>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* Post Detail Dialog */}
            <Dialog
                open={!!selectedPost}
                onClose={() => setSelectedPost(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                    },
                }}
            >
                {selectedPost && (
                    <>
                        <DialogTitle sx={{
                            m: 0, p: 2,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            color: 'var(--text-primary)',
                            borderBottom: '1px solid var(--border-color)',
                        }}>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                Post Details
                            </Typography>
                            <IconButton
                                aria-label="close"
                                onClick={() => setSelectedPost(null)}
                                sx={{ color: 'var(--text-muted)' }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{
                            bgcolor: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-color)',
                            '& .MuiTypography-root': { color: 'inherit' },
                            '& .MuiChip-outlined': {
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)',
                            },
                        }}>
                            <Stack spacing={2}>
                                {/* Meta Info */}
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip label={`Author: ${selectedPost.author || 'Unknown'}`} variant="outlined" />
                                    {selectedPost.sentiment && (
                                        <Chip
                                            label={`Sentiment: ${getSentimentString(selectedPost.sentiment)}`}
                                            sx={{
                                                backgroundColor: TOPIC_COLORS[getSentimentString(selectedPost.sentiment).toLowerCase()] || COLORS.neutral,
                                                color: '#fff'
                                            }}
                                        />
                                    )}
                                    {selectedPost.confidence && (
                                        <Chip label={`Confidence: ${(selectedPost.confidence * 100).toFixed(1)}%`} variant="outlined" />
                                    )}
                                    {selectedPost.emotion && (
                                        <Chip
                                            label={`Emotion: ${selectedPost.emotion}`}
                                            sx={{
                                                backgroundColor: (EMOTION_COLORS[selectedPost.emotion.toLowerCase()] || '#6B7280') + '22',
                                                color: EMOTION_COLORS[selectedPost.emotion.toLowerCase()] || '#6B7280',
                                                border: `1px solid ${EMOTION_COLORS[selectedPost.emotion.toLowerCase()] || '#6B7280'}44`
                                            }}
                                        />
                                    )}
                                    {selectedPost.language && (
                                        <Chip label={`Language: ${selectedPost.language.toUpperCase()}`} variant="outlined" />
                                    )}
                                    {selectedPost.relevance != null && selectedPost.relevance > 0 && (
                                        <Chip label={`Relevance: ${(selectedPost.relevance * 100).toFixed(0)}%`} variant="outlined" />
                                    )}
                                    {selectedPost.timestamp && (
                                        <Chip label={`Date: ${new Date(selectedPost.timestamp).toLocaleString()}`} variant="outlined" />
                                    )}
                                </Box>

                                {/* Keywords */}
                                {selectedPost.keywords && selectedPost.keywords.length > 0 && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Keywords</Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                            {selectedPost.keywords.map((kw, i) => (
                                                <Chip key={i} label={kw} size="small"
                                                    sx={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                {/* AI Summary */}
                                {(() => {
                                    const sentimentObj = data.sentiment?.find(s => s.id === selectedPost.id)
                                    const summary = sentimentObj?.summary
                                    return summary ? (
                                        <Box sx={{
                                            bgcolor: 'rgba(16,185,129,0.08)',
                                            p: 2, borderRadius: 1,
                                            border: '1px solid rgba(16,185,129,0.2)',
                                        }}>
                                            <Typography variant="subtitle2" sx={{ color: '#10b981', mb: 0.5 }}>AI Summary</Typography>
                                            <Typography variant="body2" sx={{ color: 'var(--text-primary)' }}>{summary}</Typography>
                                        </Box>
                                    ) : null
                                })()}

                                {/* Title */}
                                {selectedPost.title && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Title</Typography>
                                        <Typography variant="h6">{selectedPost.title}</Typography>
                                    </Box>
                                )}

                                {/* Content */}
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">Content</Typography>
                                    <Typography variant="body1" sx={{
                                        whiteSpace: 'pre-wrap',
                                        bgcolor: 'var(--secondary-bg)',
                                        color: 'var(--text-primary)',
                                        p: 2,
                                        borderRadius: 1,
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        {selectedPost.text || selectedPost.content || 'No content provided'}
                                    </Typography>
                                </Box>

                                {/* URL */}
                                {selectedPost.url && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Source URL</Typography>
                                        <a href={selectedPost.url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.primary }}>
                                            {selectedPost.url}
                                        </a>
                                    </Box>
                                )}
                            </Stack>
                        </DialogContent>
                    </>
                )}
            </Dialog>
        </div>
    )
}
