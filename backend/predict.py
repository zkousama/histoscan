# File: backend/predict.py
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image
import io
import os

MODEL_PATH = os.getenv("MODEL_PATH", "model/best_cancer_model_small.h5")
IMAGE_SIZE = (100, 100)

# Load model once when module is imported
try:
    model = load_model(MODEL_PATH)
    print(f"Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

def predict_image(img_file):
    """
    Predict cancer from image file.
    
    Args:
        img_file: Flask FileStorage object or file-like object
    
    Returns:
        dict: Prediction results
    """
    if model is None:
        raise Exception("Model not loaded. Please check the model path.")
    
    try:
        # Handle Flask FileStorage object
        if hasattr(img_file, 'read'):
            # Read the file content
            img_bytes = img_file.read()
            # Reset file pointer if possible
            if hasattr(img_file, 'seek'):
                img_file.seek(0)
            # Create PIL Image from bytes
            img = Image.open(io.BytesIO(img_bytes))
        else:
            # Handle file path string
            img = Image.open(img_file)
        
        # Convert to RGB if necessary (in case of RGBA or grayscale)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize image
        img = img.resize(IMAGE_SIZE)
        
        # Convert to array and normalize
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        # Make prediction
        prediction = model.predict(img_array, verbose=0)[0][0]
        
        # Determine status and confidence
        is_cancer = prediction >= 0.5
        confidence = float(prediction if is_cancer else 1 - prediction)
        
        result = {
            "status": "Cancer" if is_cancer else "No Cancer",
            "confidence": confidence * 100,  # Convert to percentage
            "cancer_probability": float(prediction) * 100,  # Convert to percentage
        }
        
        return result
        
    except Exception as e:
        print(f"Error in predict_image: {e}")
        raise Exception(f"Image prediction failed: {str(e)}")

def health_check():
    """Check if the model is loaded and ready"""
    return {
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
        "image_size": IMAGE_SIZE
    }