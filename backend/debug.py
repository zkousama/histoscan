# File: backend/debug.py
import os
import requests
import json

def test_local_endpoints():
    """Test local endpoints"""
    base_url = "http://localhost:5000"
    
    print("Testing local endpoints...")
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
    
    # Test root endpoint
    try:
        response = requests.get(f"{base_url}/")
        print(f"Root endpoint: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Root endpoint failed: {e}")

def test_production_endpoints():
    """Test production endpoints"""
    base_url = "https://histoscan.onrender.com"
    
    print("Testing production endpoints...")
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=30)
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
    
    # Test root endpoint
    try:
        response = requests.get(f"{base_url}/", timeout=30)
        print(f"Root endpoint: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Root endpoint failed: {e}")

def check_model_file():
    """Check if model file exists"""
    model_path = "model/best_cancer_model_small.h5"
    if os.path.exists(model_path):
        size = os.path.getsize(model_path)
        print(f"Model file exists: {model_path} ({size} bytes)")
    else:
        print(f"Model file NOT found: {model_path}")
        print("Current directory contents:")
        for item in os.listdir("."):
            print(f"  {item}")
        
        if os.path.exists("model"):
            print("Model directory contents:")
            for item in os.listdir("model"):
                print(f"  model/{item}")

if __name__ == "__main__":
    print("=== Model File Check ===")
    check_model_file()
    print("\n=== Local Tests ===")
    test_local_endpoints()
    print("\n=== Production Tests ===")
    test_production_endpoints()