# **App Name**: Satellite Vision

## Core Features:

- Colab Server Connection: Allow the user to connect to a Google Colab backend server by providing the URL in an input field, then validates if the URL is provided and validates the connection with a special header.
- Image Upload and Display: Enable users to upload satellite images (.png, .jpg) via drag & drop and display them on a Leaflet map using CRS.Simple for accurate pixel-based clicking.
- Interactive Segmentation: Allow users to click on the map to place markers and store the clicked coordinates [x, y] for building detection.
- AI-Powered Building Detection: Send the uploaded image and clicked coordinates to the Colab backend for AI processing via a POST request. A loading spinner will display during the long processing time, then it renders the returned GeoJSON as a red/blue polygon layer on top of the map. The LLM uses reasoning as a tool to decide when or if to incorporate information in its output.
- Shapefile Download: Enable users to download the processed GeoJSON data as a shapefile from the backend via the /download_shp endpoint.
- Toast Notifications: Display toast notifications for successful connections, processing completion, and errors to improve user experience.

## Style Guidelines:

- Primary color: Light Green (#D0F0C0) to create a fresh and GIS-focused feel.
- Background color: Off-white (#F5FFFA) to reinforce a light mode aesthetic, with very low saturation.
- Accent color: Teal (#4DB6AC) to contrast against the background, used for interactive elements, providing a calming effect.
- Body and headline font: 'Inter', a grotesque-style sans-serif for modern readability.
- Use 'lucide-react' icons for a modern and consistent look across the application.
- Sidebar (Left) for controls, Main Area (Right) for a full-screen interactive map to optimize screen real estate.
- Loading spinner during AI processing to visually communicate ongoing operations.