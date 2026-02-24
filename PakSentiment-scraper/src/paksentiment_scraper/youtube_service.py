import asyncio
import logging
from typing import Any, Dict, List, Optional

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from youtube_transcript_api import (
    NoTranscriptFound,
    TranscriptsDisabled,
    YouTubeTranscriptApi,
)
from .models import YouTubeVideo, YouTubeComment, YouTubeTranscriptSnippet
from .base import AbstractScraperClient

logger = logging.getLogger(__name__)


class YouTubeScraperClient(AbstractScraperClient):
    """
    A client class for interacting with the YouTube Data API v3 search endpoint.
    Uses google-api-python-client wrapped in asyncio for non-blocking execution.
    """

    def __init__(self, api_key: str):
        """
        Initializes the YouTube client.
        :param api_key: The YouTube Data API v3 Key.
        """
        if not api_key:
            raise ValueError("YouTube API Key must be provided.")
        self.api_key = api_key
        # Initialize the synchronous client
        self.youtube = build("youtube", "v3", developerKey=api_key)

    async def fetch_videos(
        self, query: str, max_results: int = 10, order: str = "date"
    ) -> List[YouTubeVideo]:
        """
        Fetches recent videos based on the given query using the search endpoint.
        Wrapper around the synchronous Google API client.
        :param query: The search term.
        :param max_results: Number of videos to return (max 50 for YouTube API).
        :param order: Sort order (date, rating, relevance, title, videoCount, viewCount).
        """
        if not (0 < max_results <= 50):
            raise ValueError("max_results must be between 1 and 50.")

        logger.info(f"Searching YouTube for: '{query}' with max_results={max_results}...")

        try:
            # Run the blocking network call in a separate thread
            return await asyncio.to_thread(
                self._fetch_videos_sync, query, max_results, order
            )

        except HttpError as e:
            logger.error(
                f"YouTube API Error: {e.resp.status} - {e.content.decode('utf-8')}"
            )
            # You might want to parse this better or raise a custom exception
            raise Exception(f"YouTube API Error: {e}")
        except Exception as e:
            logger.exception(f"An unexpected error occurred: {e}")
            raise

    def _fetch_videos_sync(
        self, query: str, max_results: int, order: str
    ) -> List[YouTubeVideo]:
        """
        Synchronous method to fetch videos using google-api-python-client.
        """
        request = self.youtube.search().list(
            part="snippet",
            maxResults=max_results,
            q=query,
            type="video",
            order=order,
        )
        response = request.execute()

        items = response.get("items", [])
        results = []

        for item in items:
            snippet = item.get("snippet", {})
            video_id = item.get("id", {}).get("videoId")

            if not video_id:
                continue

            results.append(
                YouTubeVideo(
                    video_id=video_id,
                    title=snippet.get("title", ""),
                    description=snippet.get("description", ""),
                    channel_title=snippet.get("channelTitle", ""),
                    channel_id=snippet.get("channelId", ""),
                    published_at=snippet.get("publishedAt", ""),
                    url=f"https://www.youtube.com/watch?v={video_id}",
                    thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url"),
                )
            )

        return results

    async def fetch_video_comments(
        self, video_id: str, max_results: int = 10
    ) -> List[YouTubeComment]:
        """
        Fetches top-level comments for a specific video.
        :param video_id: The ID of the video.
        :param max_results: Number of comments to fetch (max 100 per page).
        """
        logger.info(
            f"Fetching comments for video: {video_id} with max_results={max_results}..."
        )
        try:
            return await asyncio.to_thread(
                self._fetch_video_comments_sync, video_id, max_results
            )
        except HttpError as e:
            logger.error(
                f"YouTube API Error fetching comments: {e.resp.status} - {e.content.decode('utf-8')}"
            )
            return []
        except Exception as e:
            logger.exception(f"Error fetching comments for {video_id}: {e}")
            return []

    def _fetch_video_comments_sync(
        self, video_id: str, max_results: int
    ) -> List[YouTubeComment]:
        """
        Synchronous method to fetch comments.
        """
        request = self.youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=max_results,
            textFormat="plainText",
        )
        response = request.execute()

        items = response.get("items", [])
        comments = []

        for item in items:
            snippet = item.get("snippet", {}).get("topLevelComment", {}).get("snippet")
            if not snippet:
                continue

            comments.append(
                YouTubeComment(
                    comment_id=item.get("id", ""),
                    author=snippet.get("authorDisplayName", ""),
                    text=snippet.get("textDisplay", ""),
                    like_count=snippet.get("likeCount", 0),
                    published_at=snippet.get("publishedAt", ""),
                )
            )
        return comments

    async def fetch_video_transcript(
        self, video_id: str, languages: Optional[List[str]] = None
    ) -> List[YouTubeTranscriptSnippet]:
        """
        Fetches the transcript for a specific video using youtube-transcript-api.
        :param video_id: The ID of the video.
        :param languages: List of language codes to attempt fetching. If None, fetches any available transcript (preferring manual).
        """
        logger.info(f"Fetching transcript for video: {video_id} (languages={languages})...")
        try:
            # Run in thread, instantiate API object locally or in init (cleaner here if stateless)
            def _fetch_transcript_sync():
                api = YouTubeTranscriptApi()
                
                if languages:
                    # Specific languages requested
                    transcript_obj = api.fetch(video_id, languages=languages)
                    final_transcript_data = transcript_obj
                else:
                    # "Any" language requested
                    transcript_list = api.list(video_id)
                    
                    # Try to find a manually created transcript first, fallback to first generated option
                    found_transcript = next((t for t in transcript_list if not t.is_generated), None)
                    if not found_transcript:
                        found_transcript = next((t for t in transcript_list), None)
                    
                    if not found_transcript:
                         raise NoTranscriptFound(video_id)
                         
                    final_transcript_data = found_transcript.fetch()

                return [
                    YouTubeTranscriptSnippet(
                        text=item.get("text") if isinstance(item, dict) else getattr(item, "text", ""),
                        start=item.get("start") if isinstance(item, dict) else getattr(item, "start", 0.0),
                        duration=item.get("duration") if isinstance(item, dict) else getattr(item, "duration", 0.0),
                    )
                    for item in final_transcript_data
                ]

            transcript = await asyncio.to_thread(_fetch_transcript_sync)
            return transcript
        except (TranscriptsDisabled, NoTranscriptFound) as e:
            logger.warning(f"No transcript found for {video_id}: {e}")
            return []
        except Exception as e:
            logger.exception(f"Error fetching transcript for {video_id}: {e}")
            return []

    async def close_connection(self):
        """
        Closes the underlying client connection.
        Google API client manages its own connection pool usually,
        but explicit close is good practice.
        """
        try:
            self.youtube.close()
        except Exception as e:
            logger.warning(f"Error closing YouTube client: {e}")
