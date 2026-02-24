import logging
from typing import Dict, List, Optional, Tuple

import tweepy.asynchronous
import tweepy.errors
from .base import AbstractScraperClient

# Default fields used in the api call
DEFAULT_TWEET_FIELDS = [
    "created_at",
    "public_metrics",
    "lang",
    "source",
    "in_reply_to_user_id",
    "referenced_tweets",
]

DEFAULT_EXPANSIONS = ["author_id", "attachments.media_keys", "referenced_tweets.id"]

DEFAULT_USER_FIELDS = ["username", "name", "location", "verified", "public_metrics"]

DEFAULT_MEDIA_FIELDS = ["type", "url", "public_metrics"]

logger = logging.getLogger(__name__)


class XScraperClient(AbstractScraperClient):
    """
    A client class for interacting with the X (Twitter) API V2 search endpoint.
    Initializes a tweepy.asynchronous.AsyncClient with the provided Bearer Token.

    Note: this client is asynchronous.
    """

    def __init__(self, bearer_token: str, wait_on_rate_limit: bool = False):
        """
        Initializes the tweepy AsyncClient.
        :param bearer_token: The X API V2 Bearer Token.
        :param wait_on_rate_limit: If True, Tweepy will wait when rate limits are hit.
        """
        self.client = tweepy.asynchronous.AsyncClient(
            bearer_token, wait_on_rate_limit=wait_on_rate_limit
        )

    async def fetch_tweets(
        self,
        query: str,
        max_results: int = 10,
        tweet_fields: Optional[List[str]] = None,
        expansions: Optional[List[str]] = None,
        user_fields: Optional[List[str]] = None,
        media_fields: Optional[List[str]] = None,
    ) -> Tuple[Optional[List], Optional[Dict], Optional[Dict]]:
        """
        Fetches recent tweets based on the given query and returns the data.
        :param query: should follow query style from X (Twitter) docs
        :param max_results: must be between 10 and 100
        :param tweet_fields: List of tweet fields to fetch. Defaults to DEFAULT_TWEET_FIELDS.
        :param expansions: List of expansions to fetch. Defaults to DEFAULT_EXPANSIONS.
        :param user_fields: List of user fields to fetch. Defaults to DEFAULT_USER_FIELDS.
        :param media_fields: List of media fields to fetch. Defaults to DEFAULT_MEDIA_FIELDS.
        """
        if not (10 <= max_results <= 100):
            raise ValueError(
                "max_results must be between 10 and 100 for this endpoint."
            )

        logger.info(f"Searching for: '{query}' with max_results={max_results}...")

        try:
            response = await self.client.search_recent_tweets(
                query=query,
                max_results=max_results,
                tweet_fields=tweet_fields or DEFAULT_TWEET_FIELDS,
                expansions=expansions or DEFAULT_EXPANSIONS,
                user_fields=user_fields or DEFAULT_USER_FIELDS,
                media_fields=media_fields or DEFAULT_MEDIA_FIELDS,
            )

            return response.data, response.includes, response

        except tweepy.errors.Forbidden as e:
            logger.error(
                f"Error: Forbidden access. Check your API access level and permissions. Details: {e}"
            )
            raise
        except Exception as e:
            logger.exception(f"An unexpected error occurred: {e}")
            raise

    async def close_connection(self):
        """Closes the underlying X (twitter) client network connection, if needed.
        AsyncClient manages its own session, but this is kept for API compatibility."""
        pass
