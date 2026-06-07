import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';
import { AbstractDataProvider } from './abstract-data.provider';
import { SentimentProvider } from './sentiment.provider';
import {
  RedditRawDataQueryDto,
  RedditSentimentQueryDto,
} from '../dto/reddit-raw-data-query.dto';
import {
  RedditRawDataResponse,
  RedditSentimentResponse,
} from '../interfaces/api-response.interface';

@Injectable()
export class RedditProvider extends AbstractDataProvider {
  constructor(
    httpService: HttpService,
    postStorage: PostStorageService,
    @InjectRepository(AnalysisSessionEntity, 'mongo')
    sessionRepo: MongoRepository<AnalysisSessionEntity>,
    private readonly sentimentProvider: SentimentProvider,
  ) {
    super(httpService, postStorage, sessionRepo, RedditProvider.name);
  }

  async fetch(
    query: RedditRawDataQueryDto,
    userId?: number,
  ): Promise<RedditRawDataResponse> {
    this.logger.log(`Query: ${JSON.stringify(query)}`);

    const response = await this.proxyRequest<RedditRawDataResponse>(
      '/reddit/search',
      {
        params: {
          subreddit: query.subreddit,
          query: query.query,
          limit: query.limit,
        },
      },
    );

    if (response.posts) {
      response.posts = response.posts.map((p: any) => {
        const id = p.post_id || p.id || crypto.randomUUID();
        return {
          ...p,
          id: String(id),
          post_id: String(id),
        };
      });
    }

    await this.storeRaw('reddit', response.posts ?? [], 'social_post');

    if (userId) {
      const sessionId = crypto.randomUUID();
      response.sessionId = sessionId;
      await this.saveSession(
        sessionId,
        userId,
        query.query,
        'reddit',
        response.posts ?? [],
      );
    }

    return response;
  }

  async fetchSentiment(
    query: RedditSentimentQueryDto,
    userId?: number,
  ): Promise<RedditSentimentResponse> {
    const rawResponse = await this.proxyRequest<RedditRawDataResponse>(
      '/reddit/search',
      {
        params: {
          subreddit: query.subreddit,
          query: query.query,
          limit: query.limit,
        },
      },
    );

    const posts = (rawResponse.posts ?? []).map((p: any) => {
      const id = p.post_id || p.id || crypto.randomUUID();
      return {
        ...p,
        id: String(id),
        post_id: String(id),
      };
    });

    const sentiment = await this.sentimentProvider.analyzeSentiment(
      posts,
      query.customTags,
    );

    const response: RedditSentimentResponse = {
      posts,
      translations: [],
      sentiment,
      count: posts.length,
    };

    await this.storeRaw('reddit', posts, 'social_post');
    await this.storeProcessed(
      'reddit',
      posts,
      [],
      sentiment,
    );

    if (userId) {
      const sessionId = crypto.randomUUID();
      response.sessionId = sessionId;
      await this.saveSession(
        sessionId,
        userId,
        query.query,
        'reddit_sentiment',
        posts,
      );
    }

    return response;
  }

  /**
   * Fetch Reddit posts using the scaled tiered endpoint (free=RSS, paid=JSON+proxy).
   * Fronted by Redis cache on the FastAPI side.
   */
  async fetchScaled(
    query: RedditRawDataQueryDto,
    userId?: number,
    tier: string = 'free',
  ): Promise<RedditRawDataResponse> {
    this.logger.log(`[Scaled] tier=${tier} query=${JSON.stringify(query)}`);

    const response = await this.proxyRequest<RedditRawDataResponse>(
      '/reddit/scaled/search',
      {
        params: {
          subreddit: query.subreddit,
          query: query.query,
          limit: query.limit,
          tier,
        },
      },
    );

    if (response.posts) {
      response.posts = response.posts.map((p: any) => {
        const id = p.post_id || p.id || crypto.randomUUID();
        return {
          ...p,
          id: String(id),
          post_id: String(id),
        };
      });
    }

    await this.storeRaw('reddit', response.posts ?? [], 'social_post');

    if (userId) {
      const sessionId = crypto.randomUUID();
      response.sessionId = sessionId;
      await this.saveSession(
        sessionId,
        userId,
        query.query,
        `reddit_scaled_${tier}`,
        response.posts ?? [],
      );
    }

    return response;
  }

  /**
   * Fetch Reddit posts using the scaled tiered endpoint and perform sentiment analysis.
   */
  async fetchScaledSentiment(
    query: RedditSentimentQueryDto,
    userId?: number,
    tier: string = 'free',
  ): Promise<RedditSentimentResponse> {
    const rawResponse = await this.proxyRequest<RedditRawDataResponse>(
      '/reddit/scaled/search',
      {
        params: {
          subreddit: query.subreddit,
          query: query.query,
          limit: query.limit,
          tier,
        },
      },
    );

    const posts = (rawResponse.posts ?? []).map((p: any) => {
      const id = p.post_id || p.id || crypto.randomUUID();
      return {
        ...p,
        id: String(id),
        post_id: String(id),
      };
    });

    const sentiment = await this.sentimentProvider.analyzeSentiment(
      posts,
      query.customTags,
    );

    const response: RedditSentimentResponse = {
      posts,
      translations: [],
      sentiment,
      count: posts.length,
    };

    await this.storeRaw('reddit', posts, 'social_post');
    await this.storeProcessed(
      'reddit',
      posts,
      [],
      sentiment,
    );

    if (userId) {
      const sessionId = crypto.randomUUID();
      response.sessionId = sessionId;
      await this.saveSession(
        sessionId,
        userId,
        query.query,
        `reddit_scaled_sentiment_${tier}`,
        posts,
      );
    }

    return response;
  }
}
