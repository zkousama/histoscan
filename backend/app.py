# File: backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import os
import gc

app = Flask(__name__)

# Configure CORS for production
CORS(app, 
     origins=["*"],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin"])

# Import predict functions after Flask app creation to save memory
from predict import predict_image, health_check

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response

@app.route("/", methods=["GET"])
def home():
    """Root endpoint to prevent 404s"""
    return jsonify({
        "message": "HistoScan API is running",
        "version": "1.0.0",
        "endpoints": {
            "/health": "GET - Health check",
            "/predict": "POST - Image prediction"
        }
    })

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
    
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        start_time = time.time()
        result = predict_image(file)
        end_time = time.time()

        result["processing_time_ms"] = int((end_time - start_time) * 1000)
        
        # Force garbage collection after prediction
        gc.collect()
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health():
    try:
        model_status = health_check()
        return jsonify({
            "status": "healthy", 
            "message": "Backend is running",
            **model_status
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

# Add a simple memory check endpoint
@app.route("/memory", methods=["GET"])
def memory_info():
    import psutil
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    return jsonify({
        "memory_usage_mb": memory_info.rss / 1024 / 1024,
        "memory_percent": process.memory_percent()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)