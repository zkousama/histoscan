import requests
import json
import sys
import time

def test_api_endpoints(base_url):
    """Test API endpoints with proper error handling"""
    print(f"Testing API at {base_url}")
    
    # Test health endpoint
    try:
        print("\n1. Testing health endpoint...")
        response = requests.get(f"{base_url}/health", timeout=10)
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Health check failed: {e}")
    
    # Test memory endpoint
    try:
        print("\n2. Testing memory endpoint...")
        response = requests.get(f"{base_url}/memory", timeout=10)
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Memory check failed: {e}")
    
    # Test CORS with OPTIONS request
    try:
        print("\n3. Testing CORS with OPTIONS request...")
        headers = {
            'Origin': 'https://histoscan.vercel.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        response = requests.options(f"{base_url}/predict", headers=headers, timeout=10)
        print(f"Status code: {response.status_code}")
        print(f"CORS Headers: {json.dumps(dict(response.headers), indent=2)}")
    except Exception as e:
        print(f"CORS check failed: {e}")
    
    # Test mock prediction
    try:
        print("\n4. Testing mock prediction with small image...")
        # Create a small test image
        from PIL import Image
        import io
        
        # Create a small 100x100 black image
        img = Image.new('RGB', (100, 100), color='black')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        files = {'image': ('test.png', img_byte_arr, 'image/png')}
        
        response = requests.post(
            f"{base_url}/predict", 
            files=files,
            headers={'Origin': 'https://histoscan.vercel.app'},
            timeout=30
        )
        
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Prediction test failed: {e}")

if __name__ == "__main__":
    # Default to production URL if not specified
    api_url = sys.argv[1] if len(sys.argv) > 1 else "https://histoscan.onrender.com"
    
    # Run tests
    test_api_endpoints(api_url)
    
    print("\nTests completed!")
