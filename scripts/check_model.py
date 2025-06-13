#!/usr/bin/env python3
import os
import sys
import requests

def check_model_file():
    """Check if model file exists locally"""
    possible_paths = [
        os.getenv("MODEL_PATH", "model/best_cancer_model_small.h5"),
        "model/best_cancer_model_small.h5",
        "backend/model/best_cancer_model_small.h5",
        os.path.join(os.getcwd(), "model/best_cancer_model_small.h5")
    ]
    
    print("Checking for model file...")
    for path in possible_paths:
        if os.path.exists(path):
            print(f"✅ Model found at: {path}")
            print(f"   File size: {os.path.getsize(path) / (1024*1024):.2f} MB")
            return True
    
    print("❌ Model file not found in any of these locations:")
    for path in possible_paths:
        print(f"   - {path}")
    
    # List directories for debugging
    print("\nDirectory contents:")
    current_dir = os.getcwd()
    print(f"Current directory: {current_dir}")
    print(f"Files in current directory: {os.listdir('.')}")
    
    if os.path.exists("model"):
        print(f"Files in model directory: {os.listdir('model')}")
    
    if os.path.exists("backend"):
        print(f"Files in backend directory: {os.listdir('backend')}")
        if os.path.exists("backend/model"):
            print(f"Files in backend/model directory: {os.listdir('backend/model')}")
    
    return False

def check_remote_model(api_url):
    """Check if model file exists on remote server"""
    try:
        print(f"\nChecking model on remote server: {api_url}")
        response = requests.get(f"{api_url}/check-model")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("found_paths"):
                print("✅ Model found on server at:")
                for path in data["found_paths"]:
                    print(f"   - {path}")
                return True
            else:
                print("❌ Model not found on server")
                print("Possible paths checked:")
                for path in data.get("possible_paths", []):
                    print(f"   - {path}")
                
                print("\nDirectory contents on server:")
                directories = data.get("directories", {})
                for dir_name, files in directories.items():
                    print(f"{dir_name}: {files}")
                return False
        else:
            print(f"❌ Error checking model on server: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        return False

if __name__ == "__main__":
    # Check local model first
    local_result = check_model_file()
    
    # Check remote model if URL provided
    if len(sys.argv) > 1:
        api_url = sys.argv[1]
        remote_result = check_remote_model(api_url)
        
        if local_result and remote_result:
            print("\n✅ Model file exists both locally and on the server")
        elif local_result:
            print("\n⚠️ Model file exists locally but not on the server")
        elif remote_result:
            print("\n⚠️ Model file exists on the server but not locally")
        else:
            print("\n❌ Model file not found locally or on the server")
    else:
        if local_result:
            print("\n✅ Model file exists locally")
        else:
            print("\n❌ Model file not found locally")
            print("To check on the server, provide the API URL as an argument")
            print("Example: python check_model.py https://histoscan.onrender.com")
