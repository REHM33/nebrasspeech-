import os
import httpx

def transcribe_audio(file_path):
    try:
        from groq import Groq
        client = Groq(
            api_key=os.environ.get("GROQ_API_KEY"),
            http_client=httpx.Client()
        )
        with open(file_path, "rb") as f:
            result = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=f
            )
        return {"text": result.text, "language": None}
    except Exception as e:
        print("Groq error:", str(e))
        return {"text": "", "language": None}
