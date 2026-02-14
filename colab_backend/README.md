# Satellite Vision - Colab Backend Setup

Follow these steps in order in a new Google Colab notebook.

### 1. Set Runtime to GPU

*   Go to `Runtime` > `Change runtime type`.
*   Select `T4 GPU` from the dropdown and click `Save`.

### 2. Install Required Libraries

Copy and run this command in a new cell. **This is a required step.** Wait for it to complete before moving on.

```bash
!pip install segment-geospatial leafmap geopandas pyngrok flask-cors rasterio flask
```

### 3. Add Ngrok Authtoken

1.  Get your free authtoken from [your ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken).
2.  In the command below, **replace the placeholder text `PASTE_YOUR_TOKEN_HERE`** with your actual token from the ngrok dashboard.
3.  Run the updated command in a new cell.

```bash
# Important: Replace PASTE_YOUR_TOKEN_HERE with your real token.
# Do not include the < > angle brackets.
!ngrok config add-authtoken PASTE_YOUR_TOKEN_HERE
```

### 4. Run the Backend Script

1.  Copy the entire content of `satellite_vision_backend.py` into a final cell.
2.  Run the cell. It will output a public `https://...` ngrok URL.
3.  Paste this URL into the "Connect Server" input in your web app and start detecting.
