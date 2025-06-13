# File: backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from predict import predict_image, health_check
import time

app = Flask(__name__)

# Configure CORS properly
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

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
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health():
    model_status = health_check()
    return jsonify({
        "status": "healthy", 
        "message": "Backend is running",
        **model_status
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)