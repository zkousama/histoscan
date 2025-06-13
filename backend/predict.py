# File: backend/predict.py
import numpy as np
import os
import logging
import gc
from PIL import Image
import io
import psutil
import traceback
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
model = None
tf = None
load_model = None

def lazy_load_tensorflow():
    """Lazy load TensorFlow to reduce memory usage"""
    global tf, load_model
    if tf is None:
        try:
            # Set environment variables before importing TensorFlow
            os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Reduce TF logging
            os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'  # Prevent TF from grabbing all GPU memory
            os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN optimizations that can cause issues
            
            # Import TensorFlow with memory optimizations
            import tensorflow as tf_module
            tf = tf_module
            
            # Configure TensorFlow for memory efficiency
            try:
                # Force CPU usage
                tf.config.set_visible_devices([], 'GPU')
                
                # Use dynamic memory allocation
                physical_devices = tf.config.list_physical_devices('CPU')
                for device in physical_devices:
                    try:
                        # Don't pre-allocate memory
                        tf.config.experimental.set_memory_growth(device, True)
                    except:
                        logger.warning("Could not set memory growth for device")
                        
                # Set thread count to reduce memory usage
                tf.config.threading.set_inter_op_parallelism_threads(1)
                tf.config.threading.set_intra_op_parallelism_threads(1)
            except Exception as e:
                logger.warning(f"Could not configure TensorFlow devices: {e}")
            
            from tensorflow.keras.models import load_model as lm
            load_model = lm
            
            logger.info("TensorFlow loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Error loading TensorFlow: {e}")
            traceback.print_exc()
            return False
    return True

# Model configuration
MODEL_PATH = os.getenv("MODEL_PATH", "model/best_cancer_model_small.h5")
IMAGE_SIZE = (100, 100)

def check_memory():
    """Check available memory"""
    memory = psutil.virtual_memory()
    return memory.percent < 85  # More conservative threshold

def load_model_safely():
    """Load model with better error handling and memory management"""
    global model
    
    if not check_memory():
        logger.warning("Low memory detected, forcing garbage collection")
        gc.collect()
        if not check_memory():
            logger.error("Insufficient memory to load model")
            return False
    
    try:
        if not lazy_load_tensorflow():
            logger.error("Failed to load TensorFlow")
            return False
        
        # Check multiple possible paths
        possible_paths = [
            MODEL_PATH,
            "model/best_cancer_model_small.h5",
            "backend/model/best_cancer_model_small.h5",
            os.path.join(os.getcwd(), "model/best_cancer_model_small.h5")
        ]
        
        model_path = None
        for path in possible_paths:
            if os.path.exists(path):
                model_path = path
                break
        
        if model_path:
            # Load model with memory optimization
            logger.info(f"Loading model from {model_path}")
            
            # Use a custom loader with optimizations
            model = load_model(model_path, compile=False)
            
            # Make a test prediction to initialize the model
            # This prevents the first real prediction from timing out
            dummy_input = np.zeros((1, 100, 100, 3), dtype=np.float32)
            with tf.device('/CPU:0'):
                model.predict(dummy_input, verbose=0)
                
            logger.info(f"Model loaded successfully and initialized")
            
            # Force garbage collection after loading
            gc.collect()
            return True
        else:
            logger.error(f"Model file not found in any of these locations: {possible_paths}")
            # List available files for debugging
            current_dir = os.getcwd()
            logger.info(f"Current directory: {current_dir}")
            logger.info(f"Files in current directory: {os.listdir('.')}")
            
            if os.path.exists("model"):
                logger.info(f"Files in model directory: {os.listdir('model')}")
            elif os.path.exists("backend"):
                logger.info(f"Files in backend: {os.listdir('backend')}")
                if os.path.exists("backend/model"):
                    logger.info(f"Files in backend/model: {os.listdir('backend/model')}")
            
            return False
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        traceback.print_exc()
        model = None
        # Clean up on error
        gc.collect()
        return False

def predict_image(img_file):
    """
    Predict cancer from image file with memory optimization.
    
    Args:
        img_file: Flask FileStorage object or file-like object
    
    Returns:
        dict: Prediction results
    """
    global model
    
    # Check memory before processing
    if not check_memory():
        gc.collect()
        if not check_memory():
            # If still low on memory, log error and continue with best effort
            logger.warning("Low memory for prediction, continuing with best effort")
    
    # Try to load model if not already loaded
    if model is None:
        logger.warning("Model not loaded, attempting to reload...")
        if not load_model_safely():
            logger.error("Failed to load model for prediction")
            raise Exception("Failed to load the prediction model. Please check server logs.")
    
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
        img = img.resize(IMAGE_SIZE, Image.Resampling.LANCZOS)
        
        # Convert to array and normalize
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        # Make prediction with memory optimization
        try:
            if not lazy_load_tensorflow():
                raise Exception("TensorFlow not available for prediction")
                
            # Use a timeout mechanism to prevent hanging
            start_time = time.time()
            
            with tf.device('/CPU:0'):  # Force CPU usage
                # Use a smaller batch size and disable verbosity
                prediction = model.predict(img_array, verbose=0, batch_size=1)[0][0]
                
            end_time = time.time()
            processing_time = int((end_time - start_time) * 1000)
            logger.info(f"Prediction completed in {processing_time}ms")
            
        except Exception as pred_error:
            logger.error(f"Prediction error: {pred_error}")
            traceback.print_exc()
            raise Exception(f"Error during image prediction: {str(pred_error)}")
        finally:
            # Clean up memory immediately
            del img_array
            del img
            gc.collect()
        
        # Determine status and confidence
        is_cancer = prediction >= 0.5
        confidence = float(prediction if is_cancer else 1 - prediction)
        
        result = {
            "status": "Cancer" if is_cancer else "No Cancer",
            "confidence": confidence * 100,  # Convert to percentage
            "cancer_probability": float(prediction) * 100,  # Convert to percentage
            "processing_time_ms": processing_time
        }
        
        logger.info(f"Prediction completed: {result['status']} ({result['confidence']:.2f}%)")
        
        # Final cleanup
        gc.collect()
        
        return result
        
    except Exception as e:
        logger.error(f"Error in predict_image: {e}")
        traceback.print_exc()
        # Clean up on error
        gc.collect()
        # Propagate the error instead of returning mock data
        raise Exception(f"Failed to process image: {str(e)}")

def health_check():
    """Check if the model is loaded and ready"""
    global model
    
    # Try to load model if not loaded
    if model is None:
        model_loaded = load_model_safely()
    else:
        model_loaded = True
    
    # Check if model file exists in any of the possible locations
    possible_paths = [
        MODEL_PATH,
        "model/best_cancer_model_small.h5",
        "backend/model/best_cancer_model_small.h5"
    ]
    
    model_exists = any(os.path.exists(path) for path in possible_paths)
    
    # Memory information
    memory = psutil.virtual_memory()
    
    return {
        "model_loaded": model_loaded,
        "model_path": MODEL_PATH,
        "model_exists": model_exists,
        "image_size": IMAGE_SIZE,
        "current_dir": os.getcwd(),
        "tensorflow_version": tf.__version__ if tf else "Not loaded",
        "checked_paths": possible_paths,
        "memory_available": memory.available / (1024**3),  # GB
        "memory_percent": memory.percent
    }
