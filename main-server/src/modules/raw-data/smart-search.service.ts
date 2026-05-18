import { HttpService } from '@nestjs/axios';
import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as natural from 'natural';

import { AnalysisSessionEntity } from '../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from './post-storage.service';
import {
    RedditSentimentQueryDto,
} from './dto/reddit-raw-data-query.dto';
import {
    TwitterSentimentQueryDto,
} from './dto/twitter-raw-data-query.dto';

import { RedditProvider } from './providers/reddit.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { CommonCrawlProvider } from './providers/commoncrawl.provider';
import { ScraplingProvider } from './providers/scrapling.provider';
import { WebProvider } from './providers/web.provider';
import { IntegrationsProvider } from './providers/integrations.provider';
import { SentimentProvider } from './providers/sentiment.provider';

@Injectable()
export class SmartSearchService {
    private readonly logger = new Logger(SmartSearchService.name);

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(AnalysisSessionEntity, 'mongo')
        private readonly sessionRepo: MongoRepository<AnalysisSessionEntity>,
        private readonly postStorageService: PostStorageService,
        private readonly redditProvider: RedditProvider,
        private readonly twitterProvider: TwitterProvider,
        private readonly commonCrawlProvider: CommonCrawlProvider,
        private readonly scraplingProvider: ScraplingProvider,
        private readonly webProvider: WebProvider,
        private readonly integrationsProvider: IntegrationsProvider,
        private readonly sentimentProvider: SentimentProvider,
    ) { }

    private logPerf(message: string) {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
        const logFile = path.join(logDir, 'smart-search-perf.log');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
    }

    private logOutput(data: any) {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
        const logFile = path.join(logDir, 'smart-search-output.log');
        const timestamp = new Date().toISOString();
        const separator = '\n' + '='.repeat(80) + '\n';
        const logEntry = `[${timestamp}] SESSION: ${data.sessionId}\nQUERY: ${data.query}\nDATA:\n${JSON.stringify(data, null, 2)}${separator}`;
        fs.appendFileSync(logFile, logEntry);
    }

    /**
     * Execute a Smart Search using AI Planning.
     */
    async executeSmartSearch(
        userQuery: string,
        userId: number,
        customTags?: string,
        userTier: string = 'free',
    ): Promise<any> {
        const totalStart = Date.now();
        this.logger.log(`[SmartSearch] Starting for user ${userId} (tier=${userTier}): ${userQuery}`);

        // ── 0. Fetch Historical Database Posts ──
        const keywords = this.extractKeywords(userQuery);
        let historicalPosts: any[] = [];
        let historicalSentiment: any[] = [];

        if (keywords.length > 0) {
            const dbDocs = await this.postStorageService.getPostsByKeywords(keywords);
            if (dbDocs.length > 0) {
                this.logger.log(`[SmartSearch] HISTORICAL HIT for "${userQuery}" (${dbDocs.length} posts found)`);
                this.logPerf(`[Historical HIT] Query: "${userQuery}" | Keywords: [${keywords.join(', ')}] | DB posts: ${dbDocs.length}`);

                dbDocs.forEach(doc => {
                    const id = doc.metadata?.sourceId || doc._id?.toString();
                    historicalPosts.push({
                        id,
                        ...doc.metadata,
                        content: doc.cleanText,
                        title: doc.title,
                        sourceEngine: doc.sourceEngine,
                    });

                    if (doc.sentiment) {
                        historicalSentiment.push({
                            id,
                            sentiment: doc.sentiment.label,
                            confidence: doc.sentiment.score,
                            summary: doc.sentiment.summary,
                            topic: 'Historical'
                        });
                    }
                });
            }
        }
        const planStart = Date.now();
        const planResult = await this.planQuery(userQuery);
        const planEnd = Date.now();
        const plans = planResult.plan || [];
        this.logPerf(`[Planning] Query: "${userQuery}" | Time: ${planEnd - planStart}ms`);

        if (plans.length === 0) {
            throw new InternalServerErrorException(
                'AI could not generate a valid search plan.',
            );
        }

        this.logger.log(`[SmartSearch] Plan generated with ${plans.length} steps`);

        // 2. Execute Plans in Parallel
        const promises = plans.map(async (p: any) => {
            const stepStart = Date.now();
            let result: any = null;
            let status = 'SUCCESS';
            try {
                if (p.source === 'reddit_sentiment' || p.source === 'reddit') {
                    const dto = new RedditSentimentQueryDto();
                    dto.subreddit = p.params?.subreddit || 'pakistan';
                    dto.query = p.params?.query || userQuery;
                    dto.limit = p.params?.limit || 10;
                    if (customTags) dto.customTags = customTags;
                    // Use scaled endpoint to fetch raw data, then apply local sentiment analysis
                    const rawResult = await this.redditProvider.fetchScaled(dto, undefined, userTier);

                    let posts = rawResult.posts || [];

                    // Filter out posts that have no text and no media
                    posts = posts.filter((p: any) => {
                        const hasText = !!(p.title?.trim() || p.content?.trim() || p.text?.trim());
                        const hasMedia = !!(p.image_url || p.video_url || p.thumbnail);
                        return hasText || hasMedia;
                    });

                    let sentiment: any[] = [];

                    if (posts.length > 0) {
                        sentiment = await this.sentimentProvider.analyzeSentiment(posts, customTags);

                        // Apply title as summary fallback if AI summary is empty
                        sentiment.forEach(s => {
                            if (!s.summary || s.summary.trim() === '') {
                                const post = posts.find(p => p.id === s.id);
                                if (post) s.summary = post.title;
                            }
                        });
                    }

                    result = {
                        ...rawResult,
                        posts,
                        sentiment
                    };
                } else if (p.source === 'twitter_sentiment' || p.source === 'twitter') {
                    const dto = new TwitterSentimentQueryDto();
                    dto.query = p.params?.query || userQuery;
                    dto.maxResults = parseInt(String(p.params?.maxResults || 10), 10);
                    if (customTags) dto.customTags = customTags;
                    result = await this.twitterProvider.fetchSentiment(dto, undefined);
                } else if (p.source === 'scrapling') {
                    if (p.params?.url) {
                        result = await this.scraplingProvider.fetchSentiment(
                            {
                                url: p.params.url,
                                fetchLimit: p.params.fetchLimit,
                                useLocal: true,
                                customTags: customTags,
                            },
                            undefined,
                        );
                    }
                } else if (p.source === 'commoncrawl') {
                    if (p.params?.domain) {
                        result = await this.commonCrawlProvider.fetchSentiment(
                            p.params,
                            undefined,
                        );
                    }
                } else if (['hackernews', 'newsapi', 'newsdata', 'gdelt', 'mastodon', 'stackoverflow', 'googletrends', 'rss'].includes(p.source)) {
                    result = await this.integrationsProvider.fetchSentiment({
                        platform: p.source,
                        query: p.params?.query || userQuery,
                        limit: p.params?.limit || 10,
                        customTags: customTags
                    }, undefined);
                } else if (p.source === 'web_search') {
                    if (p.params?.query) {
                        const limit = p.params?.limit || 10;

                        this.logger.log(`[SmartSearch] Triggering web_search for query: ${p.params.query}`);
                        const collyUrl = process.env.COLLY_SIDECAR_URL || 'http://localhost:8081';

                        const searchResStart = Date.now();
                        const searchRes = await firstValueFrom(
                            this.httpService.post(`${collyUrl}/search`, { query: p.params.query })
                        );
                        this.logPerf(`[NestJS: web_search] Search Provider Call | Time: ${Date.now() - searchResStart}ms`);

                        const searchData = searchRes.data;
                        if (searchData.success && searchData.results && searchData.results.length > 0) {
                            const topResults = searchData.results.slice(0, limit);

                            // Trigger sentiment web-scrape for each link
                            const scrapePromises = topResults.map(async (res: any) => {
                                const scrapeStart = Date.now();
                                try {
                                    const s = await this.webProvider.fetchSentiment({
                                        url: res.link,
                                        followLinks: false,
                                        fetchLimit: 1,
                                        customTags: customTags
                                    }, undefined);
                                    this.logPerf(`[NestJS: web_search] Sub-Scrape: ${res.link} | Time: ${Date.now() - scrapeStart}ms`);
                                    return s;
                                } catch (e) {
                                    this.logger.error(`[SmartSearch] web_search failed to scrape ${res.link}:`, e.message);
                                    return null;
                                }
                            });

                            const scrapeResults = await Promise.all(scrapePromises);

                            let combinedPosts: any[] = [];
                            let combinedSentiment: any[] = [];
                            let combinedCount = 0;

                            for (const s of scrapeResults) {
                                if (s) {
                                    combinedPosts = [...combinedPosts, ...(s.posts || [])];
                                    combinedSentiment = [...combinedSentiment, ...(s.sentiment || [])];
                                    combinedCount += (s.count || s.posts?.length || 0);
                                }
                            }

                            result = {
                                source: 'web_search',
                                count: combinedCount,
                                posts: combinedPosts,
                                sentiment: combinedSentiment
                            };
                        }
                    }
                }
                return result;
            } catch (e) {
                status = 'FAILED';
                this.logger.error(
                    `[SmartSearch] Step failed for ${p.source}:`,
                    e.message,
                );
                return null;
            } finally {
                const stepEnd = Date.now();
                this.logPerf(`[NestJS: ${p.source}] Total Fetch + Sentiment (${status}) | Time: ${stepEnd - stepStart}ms`);
            }
        });

        const results = await Promise.all(promises);

        // 3. Aggregate Results
        const aggregateStart = Date.now();
        let allPosts: any[] = [];
        let allSentiment: any[] = [];
        let allMedia: any[] = [];
        let totalCount = 0;

        results.forEach((res: any) => {
            if (!res) return;
            const posts = res.posts || res.tweets || res.videos || res.records || [];
            const sentiment = res.sentiment || [];
            const rawSource = res.source || 'Web';

            // Helper to strip HTML tags and decode HTML entities from Reddit/web content
            const sanitizeText = (raw: string): string => {
                if (!raw) return '';
                return raw
                    // Remove HTML comments (<!-- SC_OFF -->, <!-- SC_ON -->, etc.)
                    .replace(/<!--[\s\S]*?-->/g, '')
                    // Remove all HTML tags
                    .replace(/<[^>]*>/g, '')
                    // Decode common HTML entities
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#039;/g, "'")
                    .replace(/&apos;/g, "'")
                    .replace(/&#x27;/g, "'")
                    .replace(/&#x2F;/g, '/')
                    .replace(/&nbsp;/g, ' ')
                    // Collapse multiple whitespace/newlines into single spaces
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            // Normalize post IDs: ensure every post has an `id` field
            // Reddit posts use `post_id`, tweets use `tweet_id`, etc.
            const normalizedPosts = posts.map((p: any) => {
                const id = p.id || p.post_id || p.tweet_id || p.comment_id || p.video_id || crypto.randomUUID();
                return {
                    ...p,
                    id: String(id),
                    // Ensure text/content fields are present and sanitized
                    content: sanitizeText(p.content || p.text || p.title || ''),
                    text: sanitizeText(p.text || p.content || p.title || ''),
                    title: sanitizeText(p.title || ''),
                    // Propagate image_url from Reddit posts where `url` is a direct image link
                    image_url: p.image_url || (() => {
                        const url = (p.url || '').toLowerCase();
                        if (url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/) || url.includes('i.redd.it') || url.includes('preview.redd.it') || url.includes('imgur.com')) {
                            return p.url;
                        }
                        // Use Reddit thumbnail if it's a valid URL (not "self", "default", "nsfw", etc.)
                        if (p.thumbnail && p.thumbnail.startsWith('http')) {
                            return p.thumbnail;
                        }
                        return p.image_url || null;
                    })(),
                };
            });

            // Helper to fix Reddit preview links breaking due to 403 CORS/hotlink protection
            const fixRedditImageUrl = (url: string) => {
                if (url.includes('preview.redd.it')) {
                    try {
                        const urlObj = new URL(url);
                        return `https://i.redd.it${urlObj.pathname}`;
                    } catch { }
                }
                return url;
            };

            // Extract media into standard format
            normalizedPosts.forEach((post: any) => {
                const sourceUrl = post.url || '';
                const title = post.title || 'Untitled';
                const date = post.timestamp || new Date().toISOString();

                let postSource = rawSource;
                if (sourceUrl.includes('reddit.com')) postSource = 'Reddit';
                else if (sourceUrl.includes('youtube.com')) postSource = 'YouTube';
                else if (sourceUrl.includes('news.ycombinator.com')) postSource = 'Hacker News';
                else if (sourceUrl.includes('stackoverflow.com')) postSource = 'Stack Overflow';
                else if (post.author?.includes('.')) {
                    try {
                        const urlObj = new URL(sourceUrl || `https://${post.author}`);
                        postSource = urlObj.hostname.replace(/^www\./, '');
                    } catch { postSource = post.author; }
                }

                if (post.image_url) {
                    let cleanImageUrl = post.image_url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
                    cleanImageUrl = fixRedditImageUrl(cleanImageUrl);

                    allMedia.push({
                        id: `${post.id}-img`,
                        postId: post.id,
                        type: 'image',
                        mediaUrl: `/proxy/image?url=${encodeURIComponent(cleanImageUrl)}`,
                        title,
                        source: postSource,
                        sourceUrl,
                        query: userQuery,
                        date
                    });
                }

                if (post.video_url) {
                    allMedia.push({
                        id: `${post.id}-vid`,
                        postId: post.id,
                        type: 'video',
                        mediaUrl: post.video_url,
                        title,
                        source: postSource,
                        sourceUrl,
                        query: userQuery,
                        date
                    });
                }

                if (!post.image_url && !post.video_url && sourceUrl) {
                    const lowerUrl = sourceUrl.toLowerCase();
                    if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/) || lowerUrl.includes('i.redd.it') || lowerUrl.includes('preview.redd.it') || lowerUrl.includes('imgur.com')) {
                        const isImgurGallery = lowerUrl.includes('imgur.com/a/') || lowerUrl.includes('imgur.com/gallery/');
                        if (!isImgurGallery) {
                            let finalUrl = sourceUrl.replace(/&amp;/g, '&');
                            if (lowerUrl.includes('imgur.com') && !lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/)) {
                                finalUrl = `${finalUrl}.jpg`;
                            }
                            finalUrl = fixRedditImageUrl(finalUrl);

                            allMedia.push({
                                id: `${post.id}-fallback-img`,
                                postId: post.id,
                                type: 'image',
                                mediaUrl: `/proxy/image?url=${encodeURIComponent(finalUrl)}`,
                                title,
                                source: postSource,
                                sourceUrl,
                                query: userQuery,
                                date
                            });
                        }
                    }
                }

                if (sourceUrl.includes('youtube.com/watch')) {
                    try {
                        const urlObj = new URL(sourceUrl);
                        const videoId = urlObj.searchParams.get('v');
                        if (videoId) {
                            const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                            allMedia.push({
                                id: `${post.id}-yt-thumb`,
                                postId: post.id,
                                type: 'image',
                                mediaUrl: `/proxy/image?url=${encodeURIComponent(thumbUrl)}`,
                                title,
                                source: 'YouTube',
                                sourceUrl,
                                query: userQuery,
                                date
                            });
                        }
                    } catch { }
                }
            });

            allPosts = [...allPosts, ...normalizedPosts];
            allSentiment = [...allSentiment, ...sentiment];
            totalCount += res.count || posts.length;
        });
        this.logPerf(`[Aggregation] Time: ${Date.now() - aggregateStart}ms`);

        // 3.5 Merge Historical Posts
        if (historicalPosts.length > 0) {
            // Deduplicate by ID
            const existingIds = new Set(allPosts.map(p => String(p.id)));
            const newHistoricalPosts = historicalPosts.filter(p => !existingIds.has(String(p.id)));

            allPosts = [...allPosts, ...newHistoricalPosts];

            const newHistoricalSentiments = historicalSentiment.filter(s => !existingIds.has(String(s.id)));
            allSentiment = [...allSentiment, ...newHistoricalSentiments];

            totalCount = allPosts.length;
        }

        // 4. Save Unified Session
        const sessionId = crypto.randomUUID();

        await this.saveSessionLocal(
            sessionId,
            userId,
            userQuery,
            'smart_search_mixed',
            allPosts,
        );

        const totalEnd = Date.now();
        this.logPerf(`[SmartSearch: Total] Query: "${userQuery}" | Total Execution Time: ${totalEnd - totalStart}ms`);
        this.logPerf('--------------------------------------------------------------------------------');

        let overallSentiment = 'neutral';
        if (allSentiment.length > 0) {
            const counts = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
            allSentiment.forEach((s: any) => {
                const label = (s.sentiment || '').toLowerCase();
                if (label.includes('positive')) counts.positive++;
                else if (label.includes('negative')) counts.negative++;
                else if (label.includes('mixed')) counts.mixed++;
                else counts.neutral++;
            });
            overallSentiment = Object.keys(counts).reduce((a, b) => counts[a as keyof typeof counts] > counts[b as keyof typeof counts] ? a : b);
        }

        const response = {
            source: 'Smart Search (AI)',
            count: totalCount,
            posts: allPosts,
            sentiment: allSentiment,
            media: allMedia,
            sessionId: sessionId,
            plan: plans,
            cached: false,
            overallSentiment,
        };

        // 5. Log Output before sending to frontend
        this.logOutput({ ...response, query: userQuery });

        // 6. Permanently tag new posts with these keywords in the database
        if (allPosts.length > 0) {
            for (const p of allPosts) {
                // Combine query keywords + post title/summary keywords
                let postTextToExtract = p.title || '';

                // Find matching sentiment to get the summary and topic
                const s = allSentiment.find(sent => String(sent.id) === String(p.id));
                if (s) {
                    if (s.summary) postTextToExtract += ' ' + s.summary;
                    if (s.topic) postTextToExtract += ' ' + s.topic;
                }

                // Extract keywords from the post's text
                const postKeywords = this.extractKeywords(postTextToExtract);

                // Merge and deduplicate with the main query keywords
                p.searchKeywords = Array.from(new Set([...keywords, ...postKeywords])).sort();

                const platform = p.sourceEngine || p.domain || 'smart_search';
                await this.postStorageService.storeRawPosts(platform, [p]);
                if (s) {
                    await this.postStorageService.storeProcessedPosts(platform, [p], [], [s]);
                }
            }
            this.logPerf(`[Keyword Tagging] Stored and tagged ${allPosts.length} posts`);
        }

        return response;
    }

    private async saveSessionLocal(
        sessionId: string,
        userId: number,
        query: string,
        source: string,
        rawPosts: any[],
    ) {
        if (!userId) return;
        const postIds = rawPosts
            .map((post) => {
                return (
                    post.post_id ??
                    post.id ??
                    post.tweet_id ??
                    post.comment_id ??
                    post.url ??
                    post.video_id ??
                    post.comment_id ??
                    ''
                ).toString();
            })
            .filter((id) => id && id !== 'undefined');

        const existingSession = await this.sessionRepo.findOne({ where: { sessionId } });

        if (existingSession) {
            const newPostIds = postIds.filter(id => !existingSession.postIds.includes(id));
            if (newPostIds.length > 0) {
                existingSession.postIds = [...existingSession.postIds, ...newPostIds];
                await this.sessionRepo.save(existingSession);
            }
        } else {
            const session = this.sessionRepo.create({
                sessionId,
                userId,
                query,
                source,
                postIds,
                createdAt: new Date(),
            });
            await this.sessionRepo.save(session);
        }
    }

    async planQuery(userQuery: string): Promise<any> {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new InternalServerErrorException(
                'GROQ_API_KEY not configured on server',
            );
        }

        const payload = {
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a data retrieval assistant for an advanced Data Analytics Platform.
Your goal is to analyze the user's natural language request and generate a plan to fetch data from ALL available sources simultaneously based on any topic worldwide.

AVAILABLE SOURCES:
1. "reddit_sentiment": Public opinion, discussions (Params: { subreddit, query, limit })
2. "hackernews": Tech community news & discussions (Params: { query, limit })
3. "stackoverflow": Developer Q&A and technical sentiment (Params: { query, limit })
4. "newsapi": Official news outlets and current events (Params: { query, limit })
5. "mastodon": Decentralized social media & tech crowds (Params: { query, limit })
6. "gdelt": Global events and international news (Params: { query, limit })
7. "googletrends": Search interest over time (Params: { query, limit: 1 })
8. "commoncrawl": Web history from specific domains (Params: { domain, keyword, limit })
9. "web_search": Live Google/Bing web scrape (Params: { query, limit: 3 })
10. "scrapling": For analyzing a specific URL provided by the user. ONLY use if URL is provided.

CRITICAL RULES:
- You MUST use ALL available sources simultaneously to search maximum data for the user.
- Do not limit the sources. Return a plan that includes every available source except "scrapling" (unless a URL is provided).
- If the user's request is not in English, translate the intent to English before generating the queries. ALL generated queries MUST be in English.
- Return ONLY a JSON object with a "plan" array. No extra text.

RESPONSE FORMAT:
{
"plan": [
  { "source": "reddit_sentiment", "params": { "subreddit": "technology", "query": "artificial intelligence", "limit": 10 } },
  { "source": "hackernews", "params": { "query": "AI breakthroughs", "limit": 10 } },
  { "source": "googletrends", "params": { "query": "AI", "limit": 1 } }
]
}`,
                },
                {
                    role: 'user',
                    content: userQuery,
                }
            ],
            response_format: { type: 'json_object' },
        };

        try {
            const response: any = await firstValueFrom(
                this.httpService.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    payload,
                    { headers: { Authorization: `Bearer ${apiKey}` } },
                ),
            );
            const content = response.data.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            this.logger.error(
                '[PlanQuery] Error:',
                error?.response?.data || error.message,
            );
            throw new InternalServerErrorException('Failed to generate query plan');
        }
    }

    /**
     * Extracts normalized keywords from a user query or post text using NLP.
     * Utilizes tokenization, stopword removal, and Porter Stemming.
     */
    private extractKeywords(text: string): string[] {
        if (!text) return [];

        // 1. Tokenize (handles punctuation intelligently)
        const tokenizer = new natural.WordTokenizer();
        let tokens = tokenizer.tokenize(text) || [];

        // 2. Lowercase and filter out short/meaningless fragments
        tokens = tokens
            .map(token => token.toLowerCase())
            .filter(token => token.length > 2);

        // 3. Remove stop words using natural's built-in dictionary
        // Also add a few custom ones that might slip through
        const stopWords = new Set([...natural.stopwords, 'https', 'http', 'com', 'www']);
        tokens = tokens.filter(token => !stopWords.has(token));

        // 4. Stemming (e.g., 'startups' -> 'startup', 'running' -> 'run')
        tokens = tokens.map(token => natural.PorterStemmer.stem(token));

        // 5. Remove duplicates and sort
        return Array.from(new Set(tokens)).sort();
    }
}
