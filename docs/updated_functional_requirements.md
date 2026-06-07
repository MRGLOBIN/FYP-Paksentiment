# PakSentiment System - Updated Functional Requirements (UFR)

This document defines the updated and revised functional requirements for the PakSentiment platform. These requirements reflect the design of the system, including web scraping, multi-source integrations, zero-shot LLM inference, and subscription-based access limits.

---

## Module 1: Data Ingestion and Source Integration

### FR-1: Collect Reddit Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-1 |
| **Title** | Collect Reddit Data |
| **Requirement** | The system shall fetch posts and comments from Reddit based on a specified subreddit and query. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To gather relevant community discussion data from Reddit for multidimensional sentiment and topic analysis. |
| **Business Rule** | Requests are subject to Reddit API rate limits and proxy routing in the paid tier. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-2: Collect Live Web Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-2 |
| **Title** | Collect Live Web Data |
| **Requirement** | The system shall scrape text content from general web URLs, supporting single-page scraping and crawling of sub-links to a user-configured depth limit. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To allow users to ingest unstructured text from arbitrary websites for custom sentiment reporting. |
| **Business Rule** | Scraped pages must respect robots.txt rules and user-configured crawl depth thresholds. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-3: Collect Web Archive Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-3 |
| **Title** | Collect Web Archive Data |
| **Requirement** | The system shall retrieve historical text data matching search terms from the Common Crawl index archives. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To provide users access to massive historical datasets and archival web records. |
| **Business Rule** | None |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-4: Collect Hacker News Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-4 |
| **Title** | Collect Hacker News Data |
| **Requirement** | The system shall fetch top posts and discussion comments from Hacker News matching the search query. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To ingest technology, startup, and developer-related discussions. |
| **Business Rule** | None |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-5: Collect News API Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-5 |
| **Title** | Collect News API Data |
| **Requirement** | The system shall fetch global news articles from publishers and outlets matching search terms via the News API. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To ingest mainstream global news articles to contextualize public sentiment trends. |
| **Business Rule** | Authenticated via developers' News API keys; limited to public news feeds. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-6: Collect NewsData.io Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-6 |
| **Title** | Collect NewsData.io Data |
| **Requirement** | The system shall retrieve news articles and historical metadata matching queries from NewsData.io. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To supplement news article coverage and acquire additional historical metadata. |
| **Business Rule** | Subject to NewsData.io quota allocations. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-7: Collect GDELT Event Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-7 |
| **Title** | Collect GDELT Event Data |
| **Requirement** | The system shall monitor and retrieve international news event records matching queries from the Global Database of Events, Language, and Tone (GDELT). |
| **Source** | Data Ingestion Layer |
| **Rationale** | To incorporate geopolitical and macroscopic event monitoring datasets. |
| **Business Rule** | None |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-8: Collect Mastodon Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-8 |
| **Title** | Collect Mastodon Data |
| **Requirement** | The system shall fetch decentralized microblogging posts and hashtags matching queries from Mastodon servers. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To gather microblogging opinions from decentralized fediverse networks. |
| **Business Rule** | Searches are federated across specified Mastodon server endpoints. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-9: Collect Stack Overflow Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-9 |
| **Title** | Collect Stack Overflow Data |
| **Requirement** | The system shall retrieve developer questions, answers, and tags matching queries from Stack Overflow. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To harvest software engineering technical queries and programming trend sentiment. |
| **Business Rule** | Requests are subject to Stack Exchange API usage limits. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-10: Collect Google Trends Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-10 |
| **Title** | Collect Google Trends Data |
| **Requirement** | The system shall retrieve search popularity indices and interest trends over time from Google Trends. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To measure search volume interest and compare it against scraped sentiment volumes. |
| **Business Rule** | None |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-11: Collect RSS Feed Data

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-11 |
| **Title** | Collect RSS Feed Data |
| **Requirement** | The system shall fetch and parse web syndication feeds from custom user-provided RSS URLs. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To support ingestion of custom syndicated web articles and corporate blog feeds. |
| **Business Rule** | RSS feeds must conform to standard XML, Atom, or RDF schemas. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-12: Orchestrate AI Smart Search

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-12 |
| **Title** | Orchestrate AI Smart Search |
| **Requirement** | The system shall use an AI planner to automatically orchestrate parallel collection across Reddit, Web, and Common Crawl based on a natural language prompt. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To simplify multi-source searches by letting the AI autonomously decompose queries. |
| **Business Rule** | Smart search planning uses structured LLM json outputs to invoke concurrent scraping providers. |
| **Dependencies** | FR-1, FR-2, FR-3 |
| **Priority** | High |
| **Status** | Completed |

### FR-13: Collect Media Attachments

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-13 |
| **Title** | Collect Media Attachments |
| **Requirement** | The system shall retrieve associated media URLs (including direct image links, video content URLs, and YouTube video IDs) during data collection. |
| **Source** | Data Ingestion Layer |
| **Rationale** | To capture multi-modal visual content for analytical review and rendering. |
| **Business Rule** | None |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

---

## Module 2: Data Preprocessing and Caching

### FR-14: Clean HTML Boilerplate

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-14 |
| **Title** | Clean HTML Boilerplate |
| **Requirement** | The system shall strip boilerplate HTML content (headers, footers, navigation, and advertisements) from web pages using text density algorithms. |
| **Source** | Preprocessing Layer |
| **Rationale** | To clean raw HTML documents and yield clean core article text, reducing LLM token costs. |
| **Business Rule** | Employs text-density and HTML-tag density extraction algorithms. |
| **Dependencies** | FR-2 |
| **Priority** | High |
| **Status** | Completed |

### FR-15: Preprocess Text Content

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-15 |
| **Title** | Preprocess Text Content |
| **Requirement** | The system shall sanitize scraped text data by removing emojis and URIs before submitting it for machine translation or analysis. |
| **Source** | Preprocessing Layer |
| **Rationale** | To reduce noise and clean raw text before LLM translation and inference. |
| **Business Rule** | Sanitizes text using regular expressions to strip emojis, escape characters, and hyperlink URIs. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-16: Normalize Queries

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-16 |
| **Title** | Normalize Queries |
| **Requirement** | The system shall normalize search terms to align related queries and prevent redundant scraping operations. |
| **Source** | Preprocessing Layer |
| **Rationale** | To group similar searches and optimize system performance. |
| **Business Rule** | None |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-17: Cache Content & Results

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-17 |
| **Title** | Cache Content & Results |
| **Requirement** | The system shall cache scraped raw content and sentiment analysis results in a Redis caching layer to minimize duplicate external queries. |
| **Source** | Preprocessing Layer |
| **Rationale** | To prevent hitting external API quotas and improve response times for repetitive queries. |
| **Business Rule** | TTL (Time-to-Live) values must be configured for cached data to keep results fresh. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-18: NLP-Based Historical Search

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-18 |
| **Title** | NLP-Based Historical Search |
| **Requirement** | The system shall process database search queries by tokenizing, filtering stopwords, and stemming terms using natural language processing (NLP), retrieving matching documents from MongoDB. |
| **Source** | Preprocessing Layer |
| **Rationale** | To allow rapid searching and ranking of historical collections stored in the database without hitting external sources. |
| **Business Rule** | Utilizes the natural package's WordTokenizer and PorterStemmer to match query tokens against indexed document keywords. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

---

## Module 3: Translation and Conversational AI

### FR-19: Provide Translation Interface

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-19 |
| **Title** | Provide Translation Interface |
| **Requirement** | The system shall provide a manual interface to translate text/queries from Spanish, French, German, Mandarin, Arabic, Hindi, and Roman Urdu into the English language. |
| **Source** | Translation Layer |
| **Rationale** | To allow non-English data inputs and search queries to be evaluated by the core analytics modules. |
| **Business Rule** | Leverages local or remote translation model nodes to yield English equivalents. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-20: Detect Source Language Automatically

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-20 |
| **Title** | Detect Source Language Automatically |
| **Requirement** | The translation interface shall automatically identify the source language of the input text when the auto-detect option is selected. |
| **Source** | Translation Layer |
| **Rationale** | To remove the requirement for users to manually define the source language of their text. |
| **Business Rule** | Relies on language identification classifier thresholds. |
| **Dependencies** | FR-19 |
| **Priority** | High |
| **Status** | Completed |

### FR-21: Provide Conversational Chatbot Assistant

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-21 |
| **Title** | Provide Conversational Chatbot Assistant |
| **Requirement** | The system shall provide an interactive chatbot assistant supporting multi-language conversation (English, Spanish, French, Mandarin, and Arabic). |
| **Source** | Translation Layer |
| **Rationale** | To guide users and provide a conversational interface for text querying and explanation. |
| **Business Rule** | Multilingual chat sessions are managed locally using conversational LLM pipelines. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

---

## Module 4: Multidimensional Semantic Analysis

### FR-22: Classify Sentiment

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-22 |
| **Title** | Classify Sentiment |
| **Requirement** | The system shall classify the sentiment of texts as Positive, Negative, or Neutral, and generate an associated confidence score from 0.0 to 1.0 using LLM structured JSON output. |
| **Source** | Semantic Analysis Layer |
| **Rationale** | To perform the primary evaluation of document tone for tracking public opinion. |
| **Business Rule** | Leverages structured JSON schemas enforced at the inference layer. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-23: Classify Emotion

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-23 |
| **Title** | Classify Emotion |
| **Requirement** | The system shall detect the primary emotion (specifically Joy, Anger, Fear, Surprise, Sadness, Disgust, Trust, or Anticipation) within analyzed texts. |
| **Source** | Semantic Analysis Layer |
| **Rationale** | To enrich basic sentiment analysis with deep emotional context. |
| **Business Rule** | Structured enum constraints are applied to classify the primary emotion. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-24: Classify Topic and Context

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-24 |
| **Title** | Classify Topic and Context |
| **Requirement** | The system shall categorize each text into contextual topic classes (including Politics, Economy, Technology, Health, Education, Sports, Science, Culture, Environment, Law, Society, or General). |
| **Source** | Semantic Analysis Layer |
| **Rationale** | To sort gathered data into relevant thematic classes for aggregate analysis. |
| **Business Rule** | Leverages zero-shot classification structures to assign the most relevant topic. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-25: Extract Keywords

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-25 |
| **Title** | Extract Keywords |
| **Requirement** | The system shall extract an array of three to five key terms summarizing the central themes of the text. |
| **Source** | Semantic Analysis Layer |
| **Rationale** | To isolate the primary themes of the text for indexing, tag clouds, and search. |
| **Business Rule** | Returns a string array of keywords extracted from the document content. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-26: Evaluate Relevance

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-26 |
| **Title** | Evaluate Relevance |
| **Requirement** | The system shall evaluate the semantic relevance score from 0.0 to 1.0 of each text with respect to the active search query. |
| **Source** | Semantic Analysis Layer |
| **Rationale** | To filter out spam, advertisements, or off-topic search results. |
| **Business Rule** | Scores must be represented as float values between 0.0 and 1.0. |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

### FR-27: Generate AI Summary

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-27 |
| **Title** | Generate AI Summary |
| **Requirement** | The system shall generate a concise, single-sentence summary of the text. |
| **Source** | Semantic Analysis Layer |
| **Rationale** | To provide a quick text synopsis in data feeds, reducing reading overhead. |
| **Business Rule** | Output summaries must be restricted to a single concise sentence. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-28: Identify Content Language

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-28 |
| **Title** | Identify Content Language |
| **Requirement** | The system shall identify the source language of each text using ISO 639-1 language codes. |
| **Source** | Semantic Analysis Layer |
| **Rationale** | To log source document languages and structure multi-language collections. |
| **Business Rule** | Detects and stores language identifier codes (e.g. 'en', 'ur'). |
| **Dependencies** | None |
| **Priority** | Medium |
| **Status** | Completed |

---

## Module 5: Analytical Visualization and Reporting

### FR-29: Display User Dashboard Homepage

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-29 |
| **Title** | Display User Dashboard Homepage |
| **Requirement** | The system shall provide a central user home dashboard showing smart search input, quick usage statistics (total queries, posts analyzed, active sources), recent session history, and activity charts. |
| **Source** | Visualization Layer |
| **Rationale** | To provide a unified homepage for starting searches, checking quotas, and restoring recent work. |
| **Business Rule** | Restricting data viewing based on the authenticated user's session ID. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-30: Display Analytics Dashboard KPIs

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-30 |
| **Title** | Display Analytics Dashboard KPIs |
| **Requirement** | The system shall compute and display key performance indicators (KPIs) on the dashboard header, including Total Documents, Net Sentiment Score (-100 to +100), Top Sentiment, and Average Confidence. |
| **Source** | Visualization Layer |
| **Rationale** | To summarize analysis results into simple metric scores for quick evaluation. |
| **Business Rule** | Net Sentiment Score = (Positive Count - Negative Count) / Total Count * 100. |
| **Dependencies** | FR-22 |
| **Priority** | High |
| **Status** | Completed |

### FR-31: Display Analytics Data Feed Grid

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-31 |
| **Title** | Display Analytics Data Feed Grid |
| **Requirement** | The system shall present a tabular data grid of analyzed posts showing Source (author/domain), Topic, Summary, Sentiment classification, Confidence level, Author, Date, and detailed actions. |
| **Source** | Visualization Layer |
| **Rationale** | To display structured posts side-by-side with their computed sentiment tags. |
| **Business Rule** | The grid must support sorting, pagination, and opening detail dialog cards. |
| **Dependencies** | FR-22, FR-24, FR-27 |
| **Priority** | High |
| **Status** | Completed |

### FR-32: Display Media Gallery

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-32 |
| **Title** | Display Media Gallery |
| **Requirement** | The system shall display a dedicated Media Gallery tab on the analytics dashboard to show extracted images and video attachments, including direct links to their source origins. |
| **Source** | Visualization Layer |
| **Rationale** | To isolate visual assets from textual posts in a grid gallery layout. |
| **Business Rule** | Direct links must open in a separate browser tab to prevent losing app state. |
| **Dependencies** | FR-13 |
| **Priority** | High |
| **Status** | Completed |

### FR-33: Render Sentiment Distribution

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-33 |
| **Title** | Render Sentiment Distribution |
| **Requirement** | The system shall display the breakdown proportion of Positive, Negative, and Neutral classifications in an interactive donut chart. |
| **Source** | Visualization Layer |
| **Rationale** | To visualize macroscopic sentiment breakdown ratios. |
| **Business Rule** | Chart must dynamically refresh upon filtering dashboard results. |
| **Dependencies** | FR-22 |
| **Priority** | High |
| **Status** | Completed |

### FR-34: Render Sentiment Volume

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-34 |
| **Title** | Render Sentiment Volume |
| **Requirement** | The system shall display the counts of document volumes grouped by sentiment in an interactive bar chart. |
| **Source** | Visualization Layer |
| **Rationale** | To compare quantitative document counts side-by-side. |
| **Business Rule** | None |
| **Dependencies** | FR-22 |
| **Priority** | High |
| **Status** | Completed |

### FR-35: Render Content Volume Over Time

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-35 |
| **Title** | Render Content Volume Over Time |
| **Requirement** | The system shall plot daily content generation volumes matching search queries using an interactive time-series area chart. |
| **Source** | Visualization Layer |
| **Rationale** | To map content generation velocity and spike times. |
| **Business Rule** | Timestamps must be normalized to standard calendar date limits. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-36: Render Confidence Distribution

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-36 |
| **Title** | Render Confidence Distribution |
| **Requirement** | The system shall display a histogram of model classification confidence scores in predetermined percentage buckets in an interactive bar chart. |
| **Source** | Visualization Layer |
| **Rationale** | To allow users to audit the classification reliability distribution. |
| **Business Rule** | Bucket ranges must correspond to: 0-20%, 20-40%, 40-60%, 60-80%, and 80-100%. |
| **Dependencies** | FR-22 |
| **Priority** | High |
| **Status** | Completed |

### FR-37: Render Topic Distribution

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-37 |
| **Title** | Render Topic Distribution |
| **Requirement** | The system shall display the percentage breakdown of categorized topic classifications in an interactive donut chart. |
| **Source** | Visualization Layer |
| **Rationale** | To view top themes and categories matching search terms. |
| **Business Rule** | Topic labels are limited to specified categories (e.g. Politics, Economy). |
| **Dependencies** | FR-24 |
| **Priority** | High |
| **Status** | Completed |

### FR-38: Render Top Keywords

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-38 |
| **Title** | Render Top Keywords |
| **Requirement** | The system shall display the frequency counts of the most frequent keywords in an interactive horizontal bar chart. |
| **Source** | Visualization Layer |
| **Rationale** | To quickly identify common phrases or named entities in the dataset. |
| **Business Rule** | Visualizes top 15-30 stemmed/normalized keyword counts. |
| **Dependencies** | FR-25 |
| **Priority** | High |
| **Status** | Completed |

### FR-39: Render Source Mix

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-39 |
| **Title** | Render Source Mix |
| **Requirement** | The system shall display the volume of documents harvested per data source in an interactive bar chart. |
| **Source** | Visualization Layer |
| **Rationale** | To show what platform channels contributed most heavily to the dataset. |
| **Business Rule** | Shows breakdown across Reddit, Hacker News, Common Crawl, GDELT, RSS, Mastodon, etc. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-40: Render Language Distribution

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-40 |
| **Title** | Render Language Distribution |
| **Requirement** | The system shall display the document count distribution across identified content languages in an interactive bar chart. |
| **Source** | Visualization Layer |
| **Rationale** | To identify document origin language balances. |
| **Business Rule** | Displays languages using capitalized country codes (e.g. EN, UR). |
| **Dependencies** | FR-28 |
| **Priority** | High |
| **Status** | Completed |

### FR-41: Render Sentiment Trend Over Time

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-41 |
| **Title** | Render Sentiment Trend Over Time |
| **Requirement** | The system shall display the daily progression of Positive, Negative, and Neutral document volumes in an interactive stacked area chart. |
| **Source** | Visualization Layer |
| **Rationale** | To monitor how public sentiment changes historically over a search timeline. |
| **Business Rule** | The area segments are stacked cumulatively per date node. |
| **Dependencies** | FR-22 |
| **Priority** | High |
| **Status** | Completed |

### FR-42: Render Top Authors

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-42 |
| **Title** | Render Top Authors |
| **Requirement** | The system shall plot the document counts of the most active authors and domain sources in an interactive horizontal bar chart. |
| **Source** | Visualization Layer |
| **Rationale** | To check for dominant content contributors or spam accounts in the feed. |
| **Business Rule** | Visualizes top 10 authors sorted by document count. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-43: Render Content Length

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-43 |
| **Title** | Render Content Length |
| **Requirement** | The system shall display the distribution of document word counts across pre-defined length ranges in an interactive bar chart. |
| **Source** | Visualization Layer |
| **Rationale** | To measure average length characteristics of analyzed materials. |
| **Business Rule** | Buckets correspond to: 0-50, 50-100, 100-200, 200-500, 500-1k, and 1k+ words. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-44: Render Peak Activity Hours

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-44 |
| **Title** | Render Peak Activity Hours |
| **Requirement** | The system shall display document density trends grouped by weekday and hour of the day in an interactive activity heatmap grid. |
| **Source** | Visualization Layer |
| **Rationale** | To discover peak times of day when topics are actively posted or discussed. |
| **Business Rule** | Renders a 7x24 grid where block opacity matches post count levels. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-45: Export CSV and PDF Reports

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-45 |
| **Title** | Export CSV and PDF Reports |
| **Requirement** | The system shall support client-side exporting of analyzed data table rows as downloadable CSV files or structured PDF reports containing date, source, author, text snippet, sentiment, and topic. |
| **Source** | Visualization Layer |
| **Rationale** | To allow users to share summaries and download raw results for external audits. |
| **Business Rule** | Reports must format columns nicely and restrict content snippet lengths to prevent overflow. |
| **Dependencies** | FR-31 |
| **Priority** | High |
| **Status** | Completed |

### FR-46: Filter Dashboard Results

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-46 |
| **Title** | Filter Dashboard Results |
| **Requirement** | The system shall support client-side filtering of dashboard metrics by source, language, date range, and custom sentiment tags. |
| **Source** | Visualization Layer |
| **Rationale** | To allow micro-targeting of data subsections on the fly without running new queries. |
| **Business Rule** | Filter actions must update all KPIs and graphs reactively. |
| **Dependencies** | FR-30, FR-33 |
| **Priority** | High |
| **Status** | Completed |

---

## Module 6: Authentication and Subscription Management

### FR-47: Authenticate Users

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-47 |
| **Title** | Authenticate Users |
| **Requirement** | The system shall provide secure registration, email login, and Google OAuth authentication using JWTs. |
| **Source** | Session & Subscription Layer |
| **Rationale** | To verify users, protect session records, and manage billing accounts. |
| **Business Rule** | Tokens are stored securely as JWT session markers. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-48: Support Password Recovery

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-48 |
| **Title** | Support Password Recovery |
| **Requirement** | The system shall support password recovery via a forgot-password mechanism sending instructions or reset links to the registered email. |
| **Source** | Session & Subscription Layer |
| **Rationale** | To enable password resets when credentials are lost. |
| **Business Rule** | Links must use unique temporary tokens that expire after configured timeframe. |
| **Dependencies** | FR-47 |
| **Priority** | High |
| **Status** | Completed |

### FR-49: Store and Restore Sessions

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-49 |
| **Title** | Store and Restore Sessions |
| **Requirement** | The system shall save raw collected documents, custom options, and analysis results to MongoDB to allow session restoration by session UUID. |
| **Source** | Session & Subscription Layer |
| **Rationale** | To prevent losing work and allow users to reopen past dashboards. |
| **Business Rule** | Database entries must map to unique user account documents. |
| **Dependencies** | None |
| **Priority** | High |
| **Status** | Completed |

### FR-50: Integrate Tiered Subscriptions

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-50 |
| **Title** | Integrate Tiered Subscriptions |
| **Requirement** | The system shall use Stripe billing to enforce account tiers, routing free accounts to basic limits and paid accounts to proxy services. |
| **Source** | Session & Subscription Layer |
| **Rationale** | To monetize the platform, partition server loads, and prevent scraping abuse. |
| **Business Rule** | Tiers correspond to free, premium, and admin packages. |
| **Dependencies** | FR-47 |
| **Priority** | High |
| **Status** | Completed |

### FR-51: Store Generated Reports

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | FR-51 |
| **Title** | Store Generated Reports |
| **Requirement** | The system shall support storing exported PDF/CSV report files in the database for future retrieval. |
| **Source** | Session & Subscription Layer |
| **Rationale** | To allow history logs of downloaded report files to be accessed remotely. |
| **Business Rule** | Storage files must be linked directly to user session references in MongoDB. |
| **Dependencies** | FR-45, FR-49 |
| **Priority** | Medium |
| **Status** | Remaining |
