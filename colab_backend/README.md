# Satellite Vision - Google Colab Backend

This document provides step-by-step instructions on how to run the Python backend for the Satellite Vision application in a Google Colab notebook.

**IMPORTANT:** You must run the cells in the correct order. Please wait for each step to complete before moving to the next one.

---

## Step 1: Create a New Colab Notebook & Set Runtime

1.  Go to [https://colab.research.google.com/](https://colab.research.google.com/) and click **New notebook**.
2.  Change the runtime to use a **GPU accelerator** for faster processing.
    *   Go to the menu: `Runtime` > `Change runtime type`.
    *   From the "Hardware accelerator" dropdown, select `T4 GPU`.
    *   Click `Save`.

---

## Step 2: Install Required Libraries

This is the most important step. The script will not work without these libraries.

1.  Create a new code cell in your notebook.
2.  Copy the **entire command** below, paste it into the cell, and run it.
3.  Wait for the installation to complete. This may take a minute or two.

```bash
!pip install segment-geospatial leafmap geopandas pyngrok flask-cors rasterio flask
```

---

## Step 3: Add Your Ngrok Authtoken

`ngrok` creates a secure public URL for the backend service running in your notebook. This requires a free account and an "authtoken."

1.  Sign up for a free account at [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup).
2.  After signing up, find your **Authtoken** on your dashboard here: [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken).
3.  Create a **new code cell** in your Colab notebook.
4.  Copy the command below and **replace `<YOUR_NGROK_AUTHTOKEN>`** with your actual token from the ngrok dashboard.
5.  Run the cell.

```bash
# Example: !ngrok config add-authtoken 2aBcDeFgHiJkLmNoPqRsTuVwXyZ
!ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```

---

## Step 4: Run the Main Backend Script

1.  Create one final code cell in your notebook.
2.  Copy the **entire content** of the `satellite_vision_backend.py` file from your project and paste it into this cell.
3.  Run the cell.

After a few moments, the script will start the web server and print out a public `ngrok` URL, which will look something like this:

`* Backend is live! Connect the frontend to this URL: https://xxxxxxxx.ngrok-free.app`

---

## Step 5: Connect Your Web Application

1.  Copy the `https://xxxxxxxx.ngrok-free.app` URL from the Colab output.
2.  Go to your Satellite Vision web application.
3.  Paste the URL into the "Connect Server" input field in the sidebar and you are ready to start detecting buildings!

**Note:** The Colab notebook must remain running while you are using the application. If the notebook disconnects, you will need to re-run the final script cell (Step 4) to get a new URL.
