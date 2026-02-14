# Satellite Vision - Colab Backend Setup

This backend is designed to run in a single Google Colab cell.

### 1. Set Runtime to GPU

*   In your Colab notebook, go to `Runtime` > `Change runtime type`.
*   Select `T4 GPU` from the dropdown and click `Save`.

### 2. Configure Ngrok (One-Time Setup)

1.  Get your free authtoken from [your ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken).
2.  In a **new cell** in your Colab notebook, run this command **only once**. Replace `PASTE_YOUR_TOKEN_HERE` with your actual token.

    ```bash
    !ngrok config add-authtoken PASTE_YOUR_TOKEN_HERE
    ```

### 3. Run the Backend

1.  Copy the **entire content** of the `satellite_vision_backend.py` file.
2.  Paste it into a **new single cell** in your notebook and run it.
3.  The script will install its own dependencies and start the server.
4.  It will output a public `https://...` ngrok URL. Paste this URL into your web app's "Connect Server" input.
