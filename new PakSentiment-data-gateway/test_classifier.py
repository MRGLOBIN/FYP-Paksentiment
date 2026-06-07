import asyncio
from services.sentiment_classifier import get_analysis_model
import json

docs = [
    {
        "id": "t3_1tysi0x",
        "text": "Newly wed and Intimacy ..\nSalam, I'm completely aware how the bedroom things between a husband and a wife shouldn't be discussed out in public, but as I'm a single child and in dire need for a suggestion – I'm opting for this sub to get some help anonymously."
    },
    {
        "id": "t3_1tykd7p",
        "text": "Question from a Muslim Jordanian: Do people in Pakistan generally view Jordanians as being pro-Israel?\nI travel frequently, and on one trip I met a Pakistani guy. When he found out I was Jordanian, I noticed he didn’t seem very receptive, and he asked whether I was friends with Israelis."
    }
]

async def run():
    model = get_analysis_model()
    res = await model.process_batch(docs)
    print("OUTPUT:", json.dumps(res, indent=2))

asyncio.run(run())
