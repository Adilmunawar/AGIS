# Satellite Vision - Colab Backend Setup

Follow these steps in a new Google Colab notebook.

### 1. Set Runtime to GPU

*   Go to `Runtime` > `Change runtime type`.
*   Select `T4 GPU` from the dropdown and click `Save`.

### 2. Add Ngrok Authtoken

1.  Get your free authtoken from [your ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken).
2.  In the command below, **replace `PASTE_YOUR_TOKEN_HERE`** with your actual token.
3.  Run this command in a new cell.

```bash
!ngrok config add-authtoken PASTE_YOUR_TOKEN_HERE
```

### 3. Run the Backend Script

1.  Copy the entire content of `satellite_vision_backend.py` into a final cell and run it.
2.  **The first time you run it,** it will install all dependencies and then stop.
3.  **Run the same cell a second time** to start the backend server.
4.  It will output a public `https://...` ngrok URL. Paste this URL into the "Connect Server" input in your web app.
