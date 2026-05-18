import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SentimentProvider {
    private readonly logger = new Logger(SentimentProvider.name);
    private readonly ollamaUrl: string;
    private readonly ollamaModel: string;
    private readonly fastApiBaseUrl: string;

    constructor(private readonly httpService: HttpService) {
        this.ollamaUrl = process.env.OLLAMA_URL!;
        this.ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
        this.fastApiBaseUrl = process.env.FAST_API_BASE_URL || 'http://localhost:8000';
    }

    /**
     * Run sentiment analysis — tries Gemini first, then Ollama, falls back to FastAPI.
     */
    async analyzeSentiment(posts: any[], customTags?: string): Promise<any[]> {
        const MAX_WORDS = 30; // Limit to 30 words to drastically save input tokens and speed up generation
        const allDocs: { id: string; text: string; originalId: string; needsSummary: boolean }[] = [];

        const truncateToWords = (text: string, maxWords: number) => {
            if (!text) return '';
            const words = text.trim().split(/\s+/);
            if (words.length <= maxWords) return text;
            return words.slice(0, maxWords).join(' ') + '...';
        };

        posts.forEach((p) => {
            const text = p.content || p.text || '';
            const docId = String(p.id || p.post_id || p.tweet_id || p.comment_id || p.video_id || '');
            if (text.length > 0 && docId) {
                const needsSummary = !p.title || p.title.trim() === '';
                allDocs.push({ id: docId, originalId: docId, text: truncateToWords(text, MAX_WORDS), needsSummary });
            }
        });

        if (allDocs.length === 0) return [];

        const rawSentiments: any[] = [];
        let pendingDocs = [...allDocs];

        // ── 1. Try Ollama phi3:mini first ──
        if (pendingDocs.length > 0) {
            try {
                const ollamaUp = await this.isOllamaAvailable();
                if (ollamaUp) {
                    this.logger.log(`[Sentiment] Ollama available — using ${this.ollamaModel} for ${pendingDocs.length} doc(s)`);
                    const ollamaResults = await this.analyzeSentimentWithOllama(pendingDocs, customTags);
                    rawSentiments.push(...ollamaResults);
                    const successfulIds = new Set(ollamaResults.map(r => r.id));
                    pendingDocs = pendingDocs.filter(d => !successfulIds.has(d.id));
                } else {
                    this.logger.warn('[Sentiment] Ollama unavailable — falling back to FastAPI');
                }
            } catch (err) {
                this.logger.warn(`[Sentiment] Ollama sentiment failed: ${err.message} — falling back to FastAPI`);
            }
        }



        // ── Map back to original documents ──
        const aggregated = (rawSentiments ?? []).map((s: any) => {
            return {
                id: s.id,
                sentiment: s.sentiment || 'Neutral',
                confidence: s.confidence || 0.5,
                topic: s.topic || 'General',
                summary: s.summary || '',
                engine: s.engine || 'unknown',
            };
        });


        this.logger.log(`[Sentiment] Analysis complete: ${aggregated.length} docs processed`);
        return aggregated;
    }

    /**
     * Quick health-check ping to the Ollama server.
     */
    async isOllamaAvailable(): Promise<boolean> {
        try {
            this.logger.log(`[Sentiment] Pinging Ollama at ${this.ollamaUrl}/api/tags (model: ${this.ollamaModel})`);
            const res = await firstValueFrom(
                this.httpService.get(`${this.ollamaUrl}/api/tags`, { timeout: 15000 }),
            );
            const available = res.data?.models?.some((m: any) => m.name === this.ollamaModel || m.name.includes(this.ollamaModel.split(':')[0]));
            this.logger.log(`[Sentiment] Ollama health check result: ${available}`);
            return available;
        } catch (err) {
            this.logger.warn(`[Sentiment] Ollama health check failed: ${err.message}`);
            return false;
        }
    }



    /**
     * Analyze sentiment using the self-hosted Ollama model (Batched).
     */
    async analyzeSentimentWithOllama(docs: { id: string; text: string; needsSummary?: boolean }[], customTags?: string): Promise<any[]> {
        const results: any[] = [];

        // Run parallel requests to Ollama to reduce overall processing time
        const promises = docs.map(async (doc) => {
            const shouldSummarize = !!doc.needsSummary;
            const prompt = this.buildSentimentPrompt(doc, customTags, shouldSummarize);

            const schemaProperties: any = {
                id: { type: "string" },
                sentiment: { type: "string" },
                confidence: { type: "number" },
                topic: { type: "string" }
            };
            const schemaRequired = ["id", "sentiment", "confidence", "topic"];

            if (shouldSummarize) {
                schemaProperties.summary = { type: "string" };
                schemaProperties.generated_title = { type: "string" };
                schemaRequired.push("summary", "generated_title");
            }

            try {
                const res = await firstValueFrom(
                    this.httpService.post(
                        `${this.ollamaUrl}/api/generate`,
                        {
                            model: this.ollamaModel,
                            prompt,
                            format: {
                                type: "object",
                                properties: schemaProperties,
                                required: schemaRequired
                            },
                            stream: false,
                            options: {
                                temperature: 0.1,
                                num_predict: 500
                            }
                        },
                        { timeout: 4800000 }, // 8 minute timeout
                    ),
                );

                const raw = res.data?.response || '';
                const parsedBatch = this.parseBatchLLMResponse(raw, [doc], `ollama:${this.ollamaModel}`);
                this.logger.log(`[Sentiment] Summarised doc ${doc.id} using AI Platform: Local Ollama (${this.ollamaModel})`);
                return parsedBatch[0] || {
                    id: doc.id,
                    sentiment: 'Neutral',
                    confidence: 0,
                    topic: 'Unknown',
                    summary: 'Analysis failed due to missing object',
                    engine: `ollama:${this.ollamaModel}`
                };
            } catch (err) {
                this.logger.warn(`[Sentiment] Ollama failed for doc ${doc.id}: ${err.message}`);
                return {
                    id: doc.id,
                    sentiment: 'Neutral',
                    confidence: 0,
                    topic: 'Unknown',
                    summary: 'Analysis failed due to an error',
                    engine: `ollama:${this.ollamaModel}`
                };
            }
        });

        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);

        return results;
    }

    /**
     * Build a structured sentiment analysis prompt for a single document.
     */
    private buildSentimentPrompt(doc: { id: string; text: string }, customTags?: string, shouldSummarize = false): string {
        const categories = customTags ? customTags : 'Positive, Negative, Neutral';

        let instructions = `1. Classify the sentiment as one of: ${categories}
2. Identify the main topic as a single word noun.
3. Give a confidence score between 0.0 and 1.0.`;

        let format = `{"id": "${doc.id}", "sentiment": "<category>", "confidence": <your confidence>, "topic": "<single word topic>"}`;

        if (shouldSummarize) {
            instructions += `\n4. Write a very short 3-5 word summary.\n5. Generate a concise 5-8 word title for the document.`;
            format = `{"id": "${doc.id}", "sentiment": "<category>", "confidence": <your confidence>, "topic": "<single word topic>", "summary": "<3-5 word summary>", "generated_title": "<concise title>"}`;
        }

        return `You are a sentiment analysis and topic classification expert. Analyze the following document and respond with ONLY a valid JSON object (no markdown, no explanation, just the JSON object).

${instructions}

Respond in this exact JSON format:
${format}

Document to analyze:
"""
${doc.text}
"""

JSON response:`;
    }

    /**
     * Helper to parse JSON array from batched LLM response strings.
     */
    private parseBatchLLMResponse(raw: string, batchDocs: any[], engineName: string): any[] {
        let parsedArray: any[] = [];
        try {
            const jsonMatch = raw.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                parsedArray = JSON.parse(jsonMatch[0]);
            } else {
                // Try parsing the entire response just in case it is pure JSON
                const parsed = JSON.parse(raw.trim());
                // If the LLM returned a single object instead of an array, wrap it in an array
                if (!Array.isArray(parsed) && parsed !== null && typeof parsed === 'object') {
                    parsedArray = [parsed];
                } else {
                    parsedArray = parsed;
                }
            }
        } catch (e) {
            // As a final fallback, try to extract just an object
            try {
                const objMatch = raw.match(/\{[\s\S]*?\}/);
                if (objMatch) {
                    parsedArray = [JSON.parse(objMatch[0])];
                }
            } catch (innerErr) {
                this.logger.warn(`[Sentiment] Failed to parse batch JSON response: ${e.message}`);
            }
        }

        const validResults: any[] = [];
        const docIds = new Set(batchDocs.map(d => String(d.id)));

        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
            for (let i = 0; i < parsedArray.length; i++) {
                const item = parsedArray[i];
                // If BATCH_SIZE is 1, forcefully map the first item to the single document we sent,
                // because small LLMs often hallucinate or strip dashes from UUIDs.
                let itemId = String(item.id);
                if (batchDocs.length === 1 && i === 0) {
                    itemId = String(batchDocs[0].id);
                }

                if (docIds.has(itemId)) {
                    validResults.push({
                        id: itemId,
                        sentiment: item.sentiment || 'Neutral',
                        confidence: typeof item.confidence === 'number' ? item.confidence : (parseFloat(item.confidence) || 0.5),
                        topic: item.topic || 'General',
                        summary: item.summary || '',
                        generatedTitle: item.generated_title || null,
                        engine: engineName
                    });
                    docIds.delete(itemId);
                }
            }
        }

        // Fill in missing docs
        for (const missingId of docIds) {
            validResults.push({
                id: missingId,
                sentiment: 'Neutral',
                confidence: 0,
                topic: 'Unknown',
                summary: 'Analysis failed due to model skipping or parse error',
                engine: engineName
            });
        }

        return validResults;
    }
}







