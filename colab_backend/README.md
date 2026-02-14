# Satellite Vision - Google Colab Backend

This document provides instructions on how to run the Python backend script for the Satellite Vision application in a Google Colab notebook.

## Step 1: Setup a New Colab Notebook

1.  Go to [https://colab.research.google.com/](https://colab.research.google.com/) and create a **New notebook**.
2.  Change the runtime to use a **GPU accelerator** for faster processing.
    *   Go to `Runtime` > `Change runtime type`.
    *   Select `T4 GPU` (or any available GPU) from the "Hardware accelerator" dropdown.
    *   Click `Save`.

## Step 2: Install Dependencies

Create a new code cell in your notebook, paste the following commands into it, and run the cell. This will install all the necessary libraries.

```bash
!pip install segment-geospatial leafmap geopandas pyngrok flask-cors rasterio flask
```

## Step 3: Set up Ngrok

`ngrok` is used to create a secure public URL for the backend service running in your notebook.

1.  Sign up for a free account at [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup).
2.  After signing up, find your **Authtoken** on your dashboard: [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken).
3.  Add a new code cell in Colab, paste your authtoken into the command below, and run it.

```bash
# Replace <YOUR_NGROK_AUTHTOKEN> with your actual token
!ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```

## Step 4: Run the Backend Script

1.  Create one final code cell in your notebook.
2.  Copy the **entire content** of the `satellite_vision_backend.py` file from your project and paste it into this cell.
3.  Run the cell.

After a few moments, the script will start the web server and print out a public `ngrok` URL, which will look something like this:

`* Running on https://xxxxxxxx.ngrok-free.app`

## Step 5: Connect to the Frontend

1.  Copy this `https://xxxxxxxx.ngrok-free.app` URL.
2.  Go to your Satellite Vision web application.
3.  Paste the URL into the "Connect Server" input field in the sidebar.

Your frontend is now connected to your Colab backend, and you can start detecting buildings!

**Note:** The Colab notebook must remain running while you are using the application. If the notebook disconnects, you will need to run the final script cell again to get a new URL.
