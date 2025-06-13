# File: backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import os
import gc
import psutil
import traceback

app = Flask(__name__)

# Configure CORS properly - allow all origins for development
CORS(app, 
     origins=["*"],  # Allow all origins
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
     supports_credentials=False,
     max_age=3600)  # Cache preflight requests for 1 hour

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    # Ensure CORS headers are set for all responses
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Max-Age"] = "3600"
    return response

# Lazy import to reduce initial memory usage
predict_image = None
health_check = None

def load_predict_functions():
    """Lazy load predict functions to reduce memory usage"""
    global predict_image, health_check
    if predict_image is None or health_check is None:
        try:
            from predict import predict_image as pi, health_check as hc
            predict_image = pi
            health_check = hc
        except Exception as e:
            print(f"Error loading predict functions: {e}")
            traceback.print_exc()
            raise

@app.route("/", methods=["GET"])
def home():
    """Root endpoint to prevent 404s"""
    return jsonify({
        "message": "HistoScan API is running",
        "version": "1.0.0",
        "endpoints": {
            "/health": "GET - Health check",
            "/predict": "POST - Image prediction",
            "/memory": "GET - Memory status"
        }
    })

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        return response
    
    # Check memory before processing
    memory_percent = psutil.virtual_memory().percent
    if memory_percent > 85:
        gc.collect()  # Force garbage collection
        if psutil.virtual_memory().percent > 90:
            return jsonify({
                "error": "Server memory too high, please try again later",
                "memory_usage": f"{memory_percent:.1f}%"
            }), 503
    
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Check file size (limit to 10MB)
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > 10 * 1024 * 1024:  # 10MB limit
        return jsonify({"error": "File too large. Maximum size is 10MB"}), 400

    try:
        # Load predict functions if not already loaded
        load_predict_functions()
        
        start_time = time.time()
        result = predict_image(file)
        end_time = time.time()

        result["processing_time_ms"] = int((end_time - start_time) * 1000)
        
        # Force garbage collection after prediction
        gc.collect()
        
        return jsonify(result)
    
    except Exception as e:
        # Force cleanup on error
        gc.collect()
        error_msg = f"Prediction failed: {str(e)}"
        print(f"ERROR: {error_msg}")
        traceback.print_exc()  # Print full traceback for debugging
        return jsonify({"error": error_msg}), 500

@app.route("/health", methods=["GET"])
def health():
    try:
        # Don't load the model for health check to save memory
        # Just check if the server is running
        memory_info = psutil.virtual_memory()
        
        return jsonify({
            "status": "healthy", 
            "message": "Backend is running",
            "memory_usage_percent": memory_info.percent,
            "memory_available_gb": memory_info.available / (1024**3),
            "memory_total_gb": memory_info.total / (1024**3)
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

@app.route("/memory", methods=["GET"])
def memory_info():
    """Detailed memory information"""
    try:
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        system_memory = psutil.virtual_memory()
        
        return jsonify({
            "process_memory_mb": memory_info.rss / 1024 / 1024,
            "process_memory_percent": process.memory_percent(),
            "system_memory_percent": system_memory.percent,
            "system_memory_available_gb": system_memory.available / (1024**3),
            "system_memory_total_gb": system_memory.total / (1024**3)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add a cleanup endpoint
@app.route("/cleanup", methods=["POST"])
def cleanup():
    """Force garbage collection"""
    try:
        gc.collect()
        return jsonify({"message": "Cleanup completed"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
