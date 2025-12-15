import spacy
from keybert import KeyBERT
from langdetect import detect
from textblob import TextBlob
import nltk

# Load resources
try:
    nltk.download('punkt', quiet=True)
except:
    print("[WARNING] NLTK punkt download failed - using fallback tokenization")
nlp = spacy.load("en_core_web_sm")
kw_model = KeyBERT()

# ------- FUNCTIONS --------

def extract_entities(text):
    doc = nlp(text)
    return [(ent.text, ent.label_) for ent in doc.ents]

def extract_keywords(text, num_keywords=5):
    keywords = kw_model.extract_keywords(text, top_n=num_keywords)
    return [kw[0] for kw in keywords]

def detect_language(text):
    return detect(text)

def analyze_sentiment(text):
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    if polarity > 0.2:
        return "positive"
    elif polarity < -0.2:
        return "negative"
    else:
        return "neutral"

def pos_tagging(text):
    doc = nlp(text)
    return [(token.text, token.pos_, token.dep_) for token in doc]

def segment_topics(text):
    try:
        sentences = nltk.sent_tokenize(text)
    except:
        # Fallback: split by periods if nltk fails
        sentences = text.split('. ')
    chunks = [" ".join(sentences[i:i+5]) for i in range(0, len(sentences), 5)]
    return chunks
