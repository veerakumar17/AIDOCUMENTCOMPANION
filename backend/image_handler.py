from fastapi import APIRouter, File, UploadFile, Form
from PIL import Image
import io
import torch
import requests
import json
import tempfile
import os
import uuid

router = APIRouter()

# Initialize components with error handling
reader = None
processor = None
model = None
device = "cpu"

try:
    import easyocr
    reader = easyocr.Reader(['en'], gpu=False)  # Use CPU for stability
    print("[OK] EasyOCR initialized")
except Exception as e:
    print(f"[WARNING] EasyOCR not available: {e}")

try:
    from transformers import Blip2Processor, Blip2ForConditionalGeneration
    # Only load BLIP2 if explicitly needed (large model)
    print("[OK] BLIP2 available (will load on demand)")
except Exception as e:
    print(f"[WARNING] BLIP2 not available: {e}")

def load_blip2():
    global processor, model, device
    if processor is None:
        try:
            processor = Blip2Processor.from_pretrained("Salesforce/blip2-opt-2.7b")
            model = Blip2ForConditionalGeneration.from_pretrained(
                "Salesforce/blip2-opt-2.7b",
                torch_dtype=torch.float32  # Use float32 for compatibility
            )
            model.eval()
            device = "cuda" if torch.cuda.is_available() else "cpu"
            model.to(device)
            print("[OK] BLIP2 model loaded")
        except Exception as e:
            print(f"[ERROR] BLIP2 loading failed: {e}")
            return False
    return True

def query_llama3(prompt: str):
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False}
        )
        return response.json().get("response", "")
    except json.JSONDecodeError:
        return "Error: Could not decode LLaMA3 response."
    except Exception as e:
        return f"Error while querying LLaMA3: {e}"

def extract_text_from_image(image: Image.Image) -> str:
    if reader is None:
        return "OCR not available - EasyOCR not installed"
    
    try:
        # Create temp file with proper cleanup
        import uuid
        temp_filename = f"temp_ocr_{uuid.uuid4().hex}.png"
        temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
        
        # Save image
        image.save(temp_path, format='PNG')
        
        # Process with OCR
        results = reader.readtext(temp_path, detail=0)
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass  # Ignore cleanup errors
            
        return " ".join(results) if results else "No text detected in image"
    except Exception as e:
        return f"OCR error: {str(e)}"

@router.post("/analyze-image/")
async def analyze_image(file: UploadFile = File(...), question: str = Form("")):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        return {"error": f"Failed to process image: {str(e)}"}

    # OCR
    ocr_text = extract_text_from_image(image)

    # Image caption using BLIP2 (optional)
    caption = "Image uploaded successfully"
    if load_blip2():
        try:
            inputs = processor(images=image, return_tensors="pt").to(device)
            generated_ids = model.generate(**inputs, max_new_tokens=50)
            caption = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        except Exception as e:
            caption = f"Caption generation failed: {str(e)}"

    # Build prompt for LLaMA3
    if question and ocr_text:
        prompt = f"""
Analyze this image based on the extracted text.

OCR Text from image:
{ocr_text}

User Question: {question}

Provide a helpful answer:"""
        answer = query_llama3(prompt)
    else:
        answer = f"Image processed. OCR extracted: '{ocr_text[:100]}...' Ask a question for analysis."

    return {
        "ocr_text": ocr_text,
        "caption": caption,
        "answer": answer
    }
