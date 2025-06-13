# File: backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from predict import predict_image, health_check
import time
import os

app = Flask(__name__)

# Configure CORS for production - allow all origins for now
CORS(app, 
     origins=["*"],  # Allow all origins for production
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin"])

@app.route("/", methods=["GET"])
def home():
    """Root endpoint to prevent 404s"""
    return jsonify({
        "message": "HistoScan API is running",
        "endpoints": {
            "/health": "GET - Health check",
            "/predict": "POST - Image prediction"
        }
    })

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
        return response
    
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
        
        response = jsonify(result)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    
    except Exception as e:
        error_response = jsonify({"error": f"Prediction failed: {str(e)}"})
        error_response.headers.add("Access-Control-Allow-Origin", "*")
        return error_response, 500

@app.route("/health", methods=["GET"])
def health():
    try:
        model_status = health_check()
        response = jsonify({
            "status": "healthy", 
            "message": "Backend is running",
            **model_status
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    except Exception as e:
        error_response = jsonify({
            "status": "unhealthy",
            "error": str(e)
        })
        error_response.headers.add("Access-Control-Allow-Origin", "*")
        return error_response, 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)