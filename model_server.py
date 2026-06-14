/**
 * AI Detection Model Server
 * Deploy on Hetzner CX22 ($4/mo) or similar cheap VPS
 * 
 * Prerequisites:
 *   pip install flask torch transformers
 * 
 * Usage:
 *   python model_server.py
 *   → listens on port 5000, POST /detect { "text": "..." }
 */

from flask import Flask, request, jsonify
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import time

app = Flask(__name__)

# Load model once at startup (takes ~5s on CPU, stays in memory)
MODEL_NAME = "roberta-base-openai-detector"  # Free on HuggingFace
print(f"Loading model {MODEL_NAME}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()
print("Model loaded. Ready.")

@app.route('/detect', methods=['POST'])
def detect():
    data = request.get_json()
    text = data.get('text', '')
    
    if not text or len(text) < 10:
        return jsonify({'error': 'Text too short'}), 400
    
    t0 = time.time()
    
    # Tokenize (max 512 tokens — RoBERTa limit)
    inputs = tokenizer(text, return_tensors='pt', truncation=True, max_length=512)
    
    # Run inference
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=-1)
        # [0] = human prob, [1] = ai prob
        ai_score = float(probs[0][1].item()) * 100
    
    elapsed = (time.time() - t0) * 1000
    
    return jsonify({
        'score': round(ai_score, 1),
        'humanScore': round(100 - ai_score, 1),
        'backend': 'roberta',
        'timeMs': round(elapsed),
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': MODEL_NAME})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
