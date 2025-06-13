# File: backend/predict.py
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image
import io
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = os.getenv("MODEL_PATH", "model/best_cancer_model_small.h5")
IMAGE_SIZE = (100, 100)

# Global model variable
model = None

def load_model_safely():
    """Load model with better error handling"""
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = load_model(MODEL_PATH)
            logger.info(f"Model loaded successfully from {MODEL_PATH}")
            return True
        else:
            logger.error(f"Model file not found at {MODEL_PATH}")
            return False
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        model = None
        return False

# Try to load model when module is imported
load_model_safely()

def predict_image(img_file):
    """
    Predict cancer from image file.
    
    Args:
        img_file: Flask FileStorage object or file-like object
    
    Returns:
        dict: Prediction results
    """
    global model
    
    # Try to load model if not already loaded
    if model is None:
        logger.warning("Model not loaded, attempting to reload...")
        if not load_model_safely():
            raise Exception("Model could not be loaded. Please check the model file.")
    
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
        
        # Make prediction with timeout protection
        try:
            prediction = model.predict(img_array, verbose=0)[0][0]
        except Exception as pred_error:
            logger.error(f"Prediction error: {pred_error}")
            raise Exception(f"Model prediction failed: {str(pred_error)}")
        
        # Determine status and confidence
        is_cancer = prediction >= 0.5
        confidence = float(prediction if is_cancer else 1 - prediction)
        
        result = {
            "status": "Cancer" if is_cancer else "No Cancer",
            "confidence": confidence * 100,  # Convert to percentage
            "cancer_probability": float(prediction) * 100,  # Convert to percentage
        }
        
        logger.info(f"Prediction completed: {result['status']} ({result['confidence']:.2f}%)")
        return result
        
    except Exception as e:
        logger.error(f"Error in predict_image: {e}")
        raise Exception(f"Image prediction failed: {str(e)}")

def health_check():
    """Check if the model is loaded and ready"""
    global model
    
    # Try to load model if not loaded
    if model is None:
        model_loaded = load_model_safely()
    else:
        model_loaded = True
    
    return {
        "model_loaded": model_loaded,
        "model_path": MODEL_PATH,
        "model_exists": os.path.exists(MODEL_PATH),
        "image_size": IMAGE_SIZE
    }