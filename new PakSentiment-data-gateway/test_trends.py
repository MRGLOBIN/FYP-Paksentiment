import asyncio
import traceback
from services.trends_service import trends_service

async def main():
    try:
        print("Calling trends service...")
        results = await trends_service.get_interest_over_time("situation between US and IRAN war")
        print("Results length:", len(results))
    except Exception as e:
        print("Caught exception:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
