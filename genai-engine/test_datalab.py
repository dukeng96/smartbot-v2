import os
import asyncio
from dotenv import load_dotenv
from datalab_sdk import DatalabClient, AsyncDatalabClient
from datalab_sdk.exceptions import DatalabAPIError

load_dotenv()
api_key = os.getenv("DATALAB_API_KEY")

def test_sync():
    print("Testing sync client")
    client = DatalabClient(api_key=api_key)
    with open("test.txt", "w") as f:
        f.write("Hello world")
    
    try:
        res = client.convert("test.txt")
        print("Success:", res.success)
        print("Markdown:", res.markdown)
    except Exception as e:
        print("Error:", e)

async def test_async():
    print("Testing async client")
    async with AsyncDatalabClient(api_key=api_key) as client:
        try:
            res = await client.convert("test.txt")
            print("Success:", res.success)
            print("Markdown:", res.markdown)
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    test_sync()
    asyncio.run(test_async())
