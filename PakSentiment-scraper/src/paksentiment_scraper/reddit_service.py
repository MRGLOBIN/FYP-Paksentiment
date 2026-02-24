import asyncio
import logging
from typing import Any, Dict, List

import asyncpraw
from asyncpraw.exceptions import RedditAPIException
from .base import AbstractScraperClient

logger = logging.getLogger(__name__)


class RedditScraperClient(AbstractScraperClient):
    """
    A client class for interacting with the Reddit search endpoint.
    Initializes a asyncpraw.Reddit with the provided client_id, client_secret and user_agent
    """

    def __init__(self, client_id: str, client_secret: str, user_agent: str):
        """
        Initializes the reddit client
        :param client_id: client id for reddit client.
        :param client_secret: client secret for reddit client.
        :param user_agent: name of agent caller will be using to connect to reddit endpoint.
        """
        self.reddit = asyncpraw.Reddit(
            client_id=client_id, client_secret=client_secret, user_agent=user_agent
        )

    async def fetch_submissions(
        self, subreddit_name: str, query: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fetches all relevant data related to the subreddit and query in subreddit.
        Handles rate limiting by waiting and retrying.
        :param subreddit_name: reddit topic you want to query.
        :param query: post query you want to search for in subreddit.
        :param limit: max limit for post you want to get in result
        """
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                subreddit = await self.reddit.subreddit(subreddit_name)
                results = []

                async for submission in subreddit.search(query, limit=limit):
                    results.append(
                        {
                            "post_id": submission.id,
                            "title": submission.title,
                            "text": submission.selftext,
                            "score": submission.score,
                            "upvote_ratio": submission.upvote_ratio,
                            "num_comments": submission.num_comments,
                            "author_name": (
                                submission.author.name
                                if submission.author
                                else "[Deleted]"
                            ),
                            "is_nsfw": submission.over_18,
                            "flair": submission.link_flair_text,
                            "created_utc": submission.created_utc,
                            "url": submission.url,
                            "permalink": submission.permalink,
                            "total_awards": submission.total_awards_received,
                            "distinguished": submission.distinguished,
                            "locked": submission.locked,
                        }
                    )

                return results

            except RedditAPIException as e:
                # Check if it's a rate limit error
                if hasattr(e, "error_type") and e.error_type == "RATELIMIT":
                    retry_count += 1
                    if retry_count >= max_retries:
                        logger.error(f"Rate limit exceeded after {max_retries} retries")
                        raise

                    wait_time = 60  
                    logger.warning(
                        f"Rate limit hit. Waiting {wait_time} seconds before retry {retry_count}/{max_retries}..."
                    )
                    await asyncio.sleep(wait_time)
                else:
                    logger.exception("Reddit API Exception occurred")
                    raise
            except Exception as e:
                logger.exception(f"An unexpected error occurred: {e}")
                raise

    # async def fetch_comments_for_submission(
    #     self, permalink: str
    # ) -> List[Dict[str, Any]]:
    #     """
    #     Fetches all comments from a single submission permalink.
    #     :param permalink: link of post for which you want to fetch comments.
    #
    #     Note: you can get permalink from any post in the submission.
    #     """
    #     try:
    #         submission = await self.reddit.submission(
    #             url=f"https://www.reddit.com{permalink}"
    #         )
    #
    #         # Replace the 'MoreComments' objects with actual comments recursively
    #         await submission.comments.replace_more(limit=None)
    #
    #         # Get a flat list of all comments in breadth-first order
    #         all_comments = await submission.comments.list()
    #
    #         results = []
    #         for comment in all_comments:
    #             # Skip comments that were deleted or removed
    #             if comment.author is None:
    #                 continue
    #
    #             results.append(
    #                 {
    #                     "comment_id": comment.id,
    #                     "body": comment.body,
    #                     "score": comment.score,
    #                     "author_name": comment.author.name,
    #                     "created_utc": comment.created_utc,
    #                     "is_submitter": comment.is_submitter,  # True if author is the OP
    #                     "parent_id": comment.parent_id,  # ID of the comment/submission it replies to
    #                 }
    #             )
    #
    #         return results
    #     except Exception as e:
    #         logger.exception(f"Error fetching comments for {permalink}: {e}")
    #         raise


    async def close_connection(self):
        """Closes the underlying Reddit client network connection"""
        await self.reddit.close()
