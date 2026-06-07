# PakSentiment System - Functional Requirements

This document lists the official functional requirements extracted from the FYP final report.

## Module 1: Data Collection

| ID | Title | Requirement | Priority |
|---|---|---|---|
| **FR-1** | Collect Tweets | The system shall collect tweets using the Twitter API based on specific keywords and hashtags. (Supported languages: Pashto, Punjabi, Urdu, or English). | High |
| **FR-2** | Collect Internet Data | The system shall collect text data from various internet sources in the required languages. | Medium |
| **FR-3** | Collect Literature Data | The system shall collect text data from books in Pashto, Punjabi, and Urdu to reveal script nuances. | Low |

## Module 2: Data Filtration

| ID | Title | Requirement | Priority |
|---|---|---|---|
| **FR-4** | Filter Tweets by Language | The system shall filter tweets to retain only those in Pashto, Punjabi, and Urdu. | High |
| **FR-5** | Shape Internet Data | The system shall format internet-collected data into sentences while preserving original meaning. | Medium |
| **FR-6** | Filter Shaped Internet Data | The system shall filter shaped internet data to retain only Pashto, Punjabi, and Urdu content. | Medium |
| **FR-7** | Shape Literature Data | The system shall format literature data into sentences while preserving original meaning. | Low |

## Module 3: Translation

| ID | Title | Requirement | Priority |
|---|---|---|---|
| **FR-8** | Clean and Preprocess Text | The system shall clean and preprocess text data by removing emojis and URIs. | High |
| **FR-9** | Translate Text | The system shall translate Pashto and Punjabi text to Urdu using an NMT model. | High |
| **FR-10** | Manage Translation Quality | The system shall verify translation quality with linguistic experts. | High |

## Module 4: Sentiment Analysis

| ID | Title | Requirement | Priority |
|---|---|---|---|
| **FR-12** | Preprocess Translated Text | The system shall preprocess translated Urdu text for sentiment classification. | High |
| **FR-13** | Classify Sentiment | The system shall classify Urdu text as positive, negative, or neutral using a sentiment analysis model. | High |
| **FR-14** | Store Sentiment Labels | The system shall store sentiment labels with original and translated text. | High |

## Module 5: Model Evaluation

| ID | Title | Requirement | Priority |
|---|---|---|---|
| **FR-15** | Evaluate Translation Model | The system shall evaluate the translation model using automated metrics BLEU and TER. | Medium |
| **FR-16** | Human Evaluation | The system shall support human evaluation of translation fluency and adequacy with linguistic experts. | Medium |

## Module 6: Model Improvement

| ID | Title | Requirement | Priority |
|---|---|---|---|
| **FR-17** | Improve Training Data | The system shall enhance training data quality. | Medium |
| **FR-18** | Increase Data Volume | The system shall expand data volume to improve model accuracy. | Medium |
| **FR-19** | Experiment with Pretrained Models | The system shall test various pretrained models to optimize performance. | Medium |
| **FR-20** | Optimize Training Process | The system shall optimize training through hyperparameter tuning and curriculum learning. | Medium |

## Module 7: Visualization

| ID | Title | Requirement | Priority |
|---|---|---|---|
| **FR-21** | Dashboard for Sentiment Trends | The system shall provide a dashboard to visualize sentiment trends over time. | High |
| **FR-22** | Filtering Options | The system shall allow filtering by social issue, language, and date range. | High |
| **FR-23** | Export Reports | The system shall enable report export in PDF or CSV format. | High |

## Module 8: Service Manager

| ID | Title | Requirement | Priority |
|---|---|---|---|
| **FR-24** | Monitor Data | The system shall monitor and collect data in real-time. | High |
| **FR-25** | Manage User Data | The system shall securely store and manage user data and sessions. | High |
| **FR-26** | Store Reports | The system shall store generated reports for future access. | Medium |
