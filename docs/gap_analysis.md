# PakSentiment - System Alignment & Gap Analysis Report

This document presents a comprehensive alignment and gap analysis comparing the **PakSentiment Functional Requirements (FR-1 to FR-26)** from the Final Year Project (FYP) report with the actual codebase implementation.

---

## 1. Executive Summary

- **Overall Alignment Score**: **~45%** (in terms of specified pipeline features)
- **Key Successes**:
  - **Visualization & Dashboard (Module 7)**: 100% aligned with high-quality Next.js components, interactive charts, and CSV/PDF export.
  - **User & Session Management (Module 8)**: Highly secure NestJS backend using PostgreSQL (TypeORM), JWT, Google OAuth, and MongoDB session tracking.
  - **Data Collection (Module 1/2)**: The internet scraping capabilities are vastly superior to what was specified, including dynamic JS rendering and multi-source fallbacks.
- **Critical Misalignments**:
  - **Translation Path & Language Target**: The specification defines a pipeline where local languages (Pashto, Punjabi) are translated into **Urdu** (FR-9) and analyzed using an **Urdu Sentiment Classifier** (FR-13). In the codebase, Urdu, Pashto, and Punjabi are detected and translated into **English** using Groq/LLaMA, and sentiment analysis is conducted on the English translation.
  - **Inactive Translation Pipeline**: The translation service (`translation.py`) is written as a utility but is bypassed in the main data gateway paths (e.g., Reddit scaled service, Twitter service), leaving translation results empty (`[]`) in the final output.
  - **Model Training vs. API Inference**: The report specifies custom NMT models, automated evaluation (BLEU/TER), human correction panels, and model training loops (curriculum learning, hyperparameter tuning). The codebase contains no training/evaluation pipelines; it operates entirely in **zero-shot inference mode** using APIs (Groq, Ollama) and off-the-shelf pre-trained LLMs.

---

## 2. Requirement Alignment Mapping

| Module & ID                 | Requirement Description                                                   | Codebase Status           | Gap Detail / Implementation Notes                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Module 1: Collection**    |                                                                           |                           |                                                                                                                                                                                                                     |
| **FR-1**                    | Collect Tweets (Urdu, Pashto, Punjabi, English)                           | **Partially Aligned**     | Implemented in `twitter_service.py` using `XScraperClient`. However, due to X API constraints, it includes a fallback that generates simulated tweets if 403 Forbidden is returned.                                 |
| **FR-2**                    | Collect Internet Data                                                     | **Highly Aligned**        | Implemented via `scrapling_service.py` (crawling) and Go `colly-sidecar`. Heavily extended to dozens of web platforms.                                                                                              |
| **FR-3**                    | Collect Literature Data (Books)                                           | **Missing**               | No code exists to parse, scan, or collect book data.                                                                                                                                                                |
| **Module 2: Filtration**    |                                                                           |                           |                                                                                                                                                                                                                     |
| **FR-4**                    | Filter Tweets by Language                                                 | **Missing**               | No filtering logic exists; tweets are processed regardless of language.                                                                                                                                             |
| **FR-5**                    | Shape Internet Data into Sentences                                        | **Partially Aligned**     | HTML parsed and cleaned into text paragraphs using `justext` and `trafilatura` to remove boilerplate, but not split into formal grammatical sentences.                                                              |
| **FR-6**                    | Filter Shaped Internet Data by Language                                   | **Missing**               | Non-specified languages are not discarded; rather, the language processor attempts to translate them.                                                                                                               |
| **FR-7**                    | Shape Literature Data                                                     | **Missing**               | Dependent on missing FR-3.                                                                                                                                                                                          |
| **Module 3: Translation**   |                                                                           |                           |                                                                                                                                                                                                                     |
| **FR-8**                    | Clean Text (remove Emojis and URIs)                                       | **Partially Aligned**     | Strips HTML boilerplate and converts tags, but does not perform regex removal of emojis and URIs in preprocess.                                                                                                     |
| **FR-9**                    | Translate Pashto and Punjabi to Urdu                                      | **Misaligned & Bypassed** | 1. Translates target languages to **English** instead of **Urdu** using Groq LLM prompts. <br>2. Bypassed in Reddit and Twitter data service flows, which bypass `LanguageProcessor` and return empty translations. |
| **FR-10**                   | Verify Translation Quality with Experts                                   | **Missing**               | No human feedback, correction panel, or database schema exists for linguistic verification.                                                                                                                         |
| **Module 4: Sentiment**     |                                                                           |                           |                                                                                                                                                                                                                     |
| **FR-12**                   | Preprocess Translated Text                                                | **Missing**               | Since texts are translated to English, there is no Urdu-specific preprocessing pipeline.                                                                                                                            |
| **FR-13**                   | Classify Sentiment (Urdu text)                                            | **Misaligned**            | Sentiment classification is run on the translated **English** text (or original English) using English-centric local Ollama (Llama 3.2 / Qwen) or Groq LLaMA models.                                                |
| **FR-14**                   | Store Sentiment Labels with Original/Translated                           | **Partially Aligned**     | Stores sentiment labels and original text in MongoDB (`AnalysisSessionEntity`), but missing translated text due to bypassed translation.                                                                            |
| **Module 5: Evaluation**    |                                                                           |                           |                                                                                                                                                                                                                     |
| **FR-15**                   | Evaluate Translation Model (BLEU, TER)                                    | **Missing**               | No evaluation modules exist.                                                                                                                                                                                        |
| **FR-16**                   | Expert Human Evaluation                                                   | **Missing**               | No expert feedback interfaces or tools.                                                                                                                                                                             |
| **Module 6: Improvement**   |                                                                           |                           |                                                                                                                                                                                                                     |
| **FR-17** to **FR-20**      | Improve Training Data, Volume, Hyperparameter tuning, Curriculum Learning | **Missing**               | The system is entirely inference-based and does not feature model training, data augmentation pipelines, or parameter optimization.                                                                                 |
| **Module 7: Visualization** |                                                                           |                           |                                                                                                                                                                                                                     |
| **FR-21**                   | Dashboard for Sentiment Trends                                            | **Highly Aligned**        | Interactive Next.js dashboard featuring chart metrics and trend breakdowns.                                                                                                                                         |
| **FR-22**                   | Filtering Options (Issue, Language, Date)                                 | **Highly Aligned**        | Implemented on frontend query builder and backend database search criteria.                                                                                                                                         |
| **FR-23**                   | Export Reports (PDF & CSV)                                                | **Highly Aligned**        | Implemented on client-side via `jsPDF`, `jspdf-autotable`, and CSV generation hooks.                                                                                                                                |
| **Module 8: Service Mgr**   |                                                                           |                           |                                                                                                                                                                                                                     |
| **FR-24**                   | Monitor Data (Real-time)                                                  | **Partially Aligned**     | Provides on-demand real-time fetching/analysis controllers, but lacks continuous scheduled background daemons.                                                                                                      |
| **FR-25**                   | Manage User Data & Sessions                                               | **Highly Aligned**        | Fully secure login, OAuth registration, JWT security, and MongoDB session tracking.                                                                                                                                 |
| **FR-26**                   | Store Generated Reports                                                   | **Partially Aligned**     | Stores search sessions in MongoDB which can regenerate the dashboard, but does not save actual exported PDF/CSV files in the database.                                                                              |

---

## 3. Detailed Gap Analysis

### Gap A: The Translation & Sentiment Analysis target

- **The Specification**: Target language is **Urdu**. The pipeline translates Pashto and Punjabi into Urdu, and performs Sentiment analysis using an Urdu-trained classifier.
- **The Codebase**: Uses **English** as the central hub. All collected text in Urdu, Pashto, or Punjabi is translated to English first, and then sentiment is classified using English-trained LLMs (Llama 3.2, Groq LLaMA, Qwen).
- **Impact**: Major architectural difference. Urdu text classification is skipped in favor of translating Urdu to English first.

### Gap B: Inactive Translation Module

- **The Codebase**: `translation.py` defines a `LanguageProcessor` that translates Pashto/Punjabi/Urdu to English. However, this is not hooked up to any active scraping or routing pipelines in `reddit_service.py`, `reddit_scaled_service.py`, or `twitter_service.py`. The `translations` array returned to the frontend is always empty (`[]`).
- **Impact**: Non-English posts are currently sent directly to the sentiment classifier in their original form (Urdu, Pashto, Punjabi), which can lead to poor sentiment accuracy on local languages depending on how well the small local LLM (`llama3.2:1b`) processes them.

### Gap C: Model Training vs. Zero-Shot API Inference

- **The Specification**: Dedicated modules for model evaluation (BLEU/TER metrics, human expert evaluation) and training improvement (curriculum learning, hyperparameter tuning).
- **The Codebase**: Designed as an end-user service backend. It acts as an orchestrator that fetches data and calls ready-made models (Ollama, Groq) via API prompts. It contains no codebase training algorithms, tuning, or evaluation datasets.
- **Impact**: All model training and improvement requirements (FR-15 to FR-20) are currently outside the system's scope.

### Gap D: Report Storage

- **The Specification**: FR-26 requires the system to store generated reports for future retrieval.
- **The Codebase**: Report exports (PDF/CSV) are generated entirely in the client's browser (via `jsPDF` / download triggers). The NestJS main-server stores search session parameters but does not have a file storage layer (like MinIO, AWS S3, or gridFS) or DB fields to upload and persist generated PDF/CSV reports.

---

## 4. Undocumented Features (In Code but Not in FRs)

The codebase has been enriched with several highly advanced features not defined in the formal specifications:

1. **Vastly Extended Data Sources**:
   - **Reddit Scraper & Cache Tiering**: Supports RSS feeds (free tier), JSON parsing with Webshare proxy rotation (paid tier), and full API fallbacks (`RedditScaledService`), fronted by Redis caching with fuzzy query matching.
   - **YouTube Scraper**: Pulls video descriptions and metadata.
   - **CommonCrawl Search**: Crawls index archives.
   - **Go Scraper Sidecar**: Crawls Hacker News, StackOverflow, news outlets (NewsAPI, NewsData.io), Mastodon, GDELT, and Google Trends.
2. **AI Multidimensional Metrics**:
   - Instead of positive/negative/neutral alone, the local LLM (`llama3.2:1b`) extracts:
     - **Emotion Classification**: (Joy, Anger, Fear, Surprise, Sadness, Disgust, Trust, Anticipation).
     - **Keyword Extraction**: (3-5 key terms per post).
     - **Relevance Scoring**: (0.0 to 1.0 confidence score of relevance to the query).
     - **Language Identification**: (Source ISO language codes).
3. **AI Smart Search Orchestrator**:
   - The `/raw-data/smart` endpoint runs a multi-source planner that aggregates data across Reddit, generic web crawling, and Common Crawl.
4. **Subscription / Payments Tiering**:
   - Code features user payments using Stripe (`payments.service.ts`), restricting paid features (like proxy JSON crawls) to paid accounts.
