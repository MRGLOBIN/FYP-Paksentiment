import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';
import { AbstractDataProvider } from './abstract-data.provider';
import { SentimentProvider } from './sentiment.provider';

@Injectable()
export class IntegrationsProvider extends AbstractDataProvider {
  private readonly sidecarUrl: string;

  constructor(
    httpService: HttpService,
    postStorage: PostStorageService,
    @InjectRepository(AnalysisSessionEntity, 'mongo')
    sessionRepo: MongoRepository<AnalysisSessionEntity>,
    private readonly sentimentProvider: SentimentProvider,
  ) {
    super(httpService, postStorage, sessionRepo, IntegrationsProvider.name);
    this.sidecarUrl = process.env.COLLY_SIDECAR_URL || 'http://localhost:8081';
  }

  /**
   * Abstract required method. We delegate directly to fetchSentiment.
   */
  async fetch(query: any, userId?: number): Promise<any> {
    return this.fetchSentiment(query, userId);
  }

  /**
   * Fetch from a specific Go sidecar integration and run sentiment analysis.
   */
  async fetchSentiment(query: { platform: string; query: string; limit?: number; customTags?: string }, userId?: number): Promise<any> {
    const { platform, query: searchQuery, limit, customTags } = query;
    this.logger.log(`[Integrations] Fetching ${platform} for query: ${searchQuery}`);

    let pages: any[] = [];
    try {
      // Use query parameters exactly as the Go sidecar expects them
      const fetchUrl = `${this.sidecarUrl}/integrations/${platform}?query=${encodeURIComponent(searchQuery)}&limit=${limit || 20}`;
      const res = await firstValueFrom(this.httpService.get(fetchUrl));
      
      const data = res.data;
      if (data.success && data.results) {
        pages = data.results;
      }
    } catch (e) {
      this.logger.error(`[Integrations] Failed to fetch from ${platform}: ${e.message}`);
      return { source: platform, count: 0, posts: [], sentiment: [], warning: `Upstream integration error: ${e.message}` };
    }

    if (pages.length === 0) {
      this.logger.warn(`[Integrations] No results found for ${platform}`);
      return { source: platform, count: 0, posts: [], sentiment: [] };
    }

    // Step 2: Map to Post format
    const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, '').trim() : '';

    const posts = pages.map((page: any) => {
      let content = page.text || page.title || '';
      content = stripHtml(content);

      let title = page.title || '';
      title = stripHtml(title);

      let author = page.author;
      if (!author || author.toLowerCase() === 'unknown') {
        try {
          if (page.url) {
            const urlObj = new URL(page.url);
            author = urlObj.hostname.replace(/^www\./, '').split('.').slice(0, -1).join('.') || urlObj.hostname;
          } else {
            author = 'Unknown Source';
          }
        } catch (e) {
          author = 'Unknown Source';
        }
      }

      const docId = crypto.randomUUID();
      return {
        id: docId,
        post_id: docId,
        title,
        content,
        author,
        timestamp: page.published_at || page.scraped_at,
        url: page.url,
        image_url: page.image_url || null,
        video_url: page.video_url || null,
        metadata: {
          source: platform,
          domain: page.extracted?.domain,
          language: page.extracted?.language,
          score: page.extracted?.score,
          interest: page.extracted?.interest,
        },
      };
    });

    // Filter out posts that have no text and no media
    const validPosts = posts.filter(p => {
      const hasText = !!(p.title?.trim() || p.content?.trim());
      const hasMedia = !!(p.image_url || p.video_url);
      return hasText || hasMedia;
    });

    if (validPosts.length === 0) {
      this.logger.warn(`[Integrations] All fetched posts for ${platform} were filtered out (no text/image).`);
      return { source: platform, count: 0, posts: [], sentiment: [] };
    }

    // Store raw posts in the database
    await this.storeRaw(platform, validPosts, 'article');

    // Step 3: Run Sentiment Analysis via Ollama Batching (no summarization for HN/SO)
    this.logger.log(`[Integrations] Running sentiment analysis on ${validPosts.length} items`);
    const sentimentResults = await this.sentimentProvider.analyzeSentiment(
      validPosts,
      customTags,
    );

    // Apply title as summary fallback if AI summary is empty
    sentimentResults.forEach(s => {
      if (!s.summary || s.summary.trim() === '') {
        const post = validPosts.find(p => p.id === s.id);
        if (post) s.summary = post.title;
      }
    });

    // Ensure we merge existing Go-sidecar sentiment (e.g. Google Trends confidence) if applicable
    for (const p of validPosts) {
      const orig = pages.find((pg) => pg.url === p.url);
      if (orig && orig.confidence) {
        // If the sidecar natively provided a confidence score (like Trends)
        const sentMatch = sentimentResults.find((s) => s.id === p.id);
        if (sentMatch) {
          sentMatch.confidence = orig.confidence;
        }
      }
    }

    // Store processed sentiment results in the database
    if (sentimentResults.length > 0) {
      await this.storeProcessed(platform, validPosts, [], sentimentResults);
    }

    // Step 4: Save Session
    const sessionId = crypto.randomUUID();
    const result = {
      source: platform,
      count: validPosts.length,
      posts: validPosts,
      sentiment: sentimentResults,
      sessionId,
    };

    await this.saveSession(sessionId, userId, searchQuery, platform, validPosts);
    
    return result;
  }
}
