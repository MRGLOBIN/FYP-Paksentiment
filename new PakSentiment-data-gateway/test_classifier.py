import asyncio
from services.sentiment_classifier import get_analysis_model
import json

doc = {
    "id": "test_id_1",
    "text": "The latest Apple silicon chips provide incredible performance for developers."
}

async def run():
    model = get_analysis_model()
    res = await model.process_batch([doc])
    print("OUTPUT:", json.dumps(res, indent=2))

asyncio.run(run())
