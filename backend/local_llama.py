import requests

def local_llama3_chat(prompt: str, task: str = "answer") -> str:
    """
    Calls local LLaMA 3 via Ollama API.
    """
    ollama_url_chat = "http://localhost:11434/api/chat"
    ollama_url_generate = "http://localhost:11434/api/generate"

    # Try Chat API first
    try:
        response = requests.post(
            ollama_url_chat,
            json={
                "model": "llama3",
                "messages": [{"role": "user", "content": prompt}],
                "stream": False
            },
            timeout=180
        )
        if response.ok:
            return response.json()['message']['content']
    except Exception as e:
        print(f"LLaMA chat API failed: {e}")

    # Fallback to Generate API
    try:
        response = requests.post(
            ollama_url_generate,
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=180
        )
        if response.ok:
            return response.json().get("response", "")
    except Exception as e:
        print(f"LLaMA generate API failed: {e}")

    # Final fallback
    return f"LLaMA 3 not available. Mock {task} response."