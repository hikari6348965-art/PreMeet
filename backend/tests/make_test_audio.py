"""Generate a short speech mp3 (meeting with a decision + action item) for notes upload tests."""
import asyncio
import os
from dotenv import load_dotenv
from emergentintegrations.llm.openai import OpenAITextToSpeech

load_dotenv("/app/backend/.env")
OUT = "/tmp/test_meeting.mp3"
TEXT = ("Hi Priya, thanks for joining the renewal call. We reviewed the pricing proposal and we have decided "
        "to go with the annual Pro plan at twenty thousand dollars. Action item: Priya will send the signed "
        "contract to legal by next Friday. Also, Marcus will schedule the onboarding session for March third. "
        "One open question is whether the security review needs to be redone this year.")


async def main():
    tts = OpenAITextToSpeech(api_key=os.environ["EMERGENT_LLM_KEY"])
    data = await tts.generate_speech(text=TEXT, model="tts-1", voice="alloy")
    with open(OUT, "wb") as f:
        f.write(data)
    print("wrote", OUT, len(data))


if __name__ == "__main__":
    asyncio.run(main())
