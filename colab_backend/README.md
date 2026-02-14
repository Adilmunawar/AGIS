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

### 3. Run the Backend Script

1.  Copy the **entire content** of the `satellite_vision_backend.py` file.
2.  Paste it into a **new single cell** in your notebook.
3.  **Run the cell.** It will install all necessary dependencies and then stop.
4.  **Run the same cell a second time.** This will start the backend server.
5.  The script will output a public `https://...` ngrok URL. Paste this URL into your web app's "Connect Server" input.
