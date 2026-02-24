from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class AbstractScraperClient(ABC):
    """
    Abstract base class for all scraper clients in the PakSentiment library.
    Enforces standardized lifecycle management and configuration validation.
    """

    @abstractmethod
    def __init__(self, *args, **kwargs):
        """
        Initialize the scraper client.
        Concrete implementations should handle their specific credentials here.
        """
        pass

    @abstractmethod
    async def close_connection(self) -> None:
        """
        Gracefully close any open network connections or sessions.
        Must be implemented by all subclasses.
        """
        pass

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """
        Optional helper to validate configuration dictionaries.
        Can be overridden or used by subclasses.
        
        :param config: Dictionary containing configuration parameters.
        :return: True if valid, raises ValueError or returns False otherwise.
        """
        return True
