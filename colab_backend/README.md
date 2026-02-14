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
2.  Run this command in a new cell, replacing `<YOUR_NGROK_AUTHTOKEN>` with your actual token.

```bash
!ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```

### 4. Run the Backend Script

1.  Copy the entire content of `satellite_vision_backend.py` into a final cell.
2.  Run the cell. It will output a public `https://...` ngrok URL.
3.  Paste this URL into the "Connect Server" input in your web app and start detecting.
