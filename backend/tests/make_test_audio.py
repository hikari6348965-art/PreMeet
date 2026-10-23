
import asyncio
import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv("/app/backend/.env")

OUT = "/tmp/test_meeting.mp3"

TEXT = (
    "Hi Priya, thanks for joining the renewal call. We reviewed the pricing "
    "proposal and we have decided to go with the annual Pro plan at twenty "
    "thousand dollars. Action item: Priya will send the signed contract to "
    "legal by next Friday. Also, Marcus will schedule the onboarding session "
    "for March third. One open question is whether the security review needs "
    "to be redone this year."
)


async def main():
    client = AsyncOpenAI(
        api_key=os.environ["OPENAI_API_KEY"]
    )

    response = await client.audio.speech.create(
        model="tts-1",
        voice="alloy",
        input=TEXT,
        response_format="mp3",
    )

    response.stream_to_file(OUT)

    print("Wrote", OUT, os.path.getsize(OUT))


if __name__ == "__main__":
    asyncio.run(main())
