# Testing the AGIS Upload Rollback Mechanism

This document outlines how to test the critical rollback feature of the `uploadMauzaData` service. This test verifies that if a Firestore write fails, the corresponding geometry file is automatically deleted from Firebase Storage, preventing orphaned data.

## Test Overview

The test works by intentionally causing a Firestore write to fail by violating the security rules. We will call the `uploadMauzaData` function with data that is missing a required field (`name`), which our `firestore.rules` will reject. This triggers the `catch` block in the service, which should then initiate the deletion of the file from Cloud Storage.

## How to Run the Test

You can run this test from your browser's developer console while the AGIS application is running locally.

1.  **Log into the Application:** Ensure you are logged into the AGIS application in your browser.

2.  **Open Developer Console:** Open your browser's developer tools (usually with F12 or Ctrl+Shift+I) and go to the "Console" tab.

3.  **Expose the Test Function (One-time setup):** For easy access, we can temporarily expose the `uploadMauzaData` function to the global `window` object. Navigate to `src/firebase/services/gis-upload.ts` and add this line at the bottom of the file:

    ```javascript
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).testUploadMauzaData = uploadMauzaData;
    }
    ```
    *Note: The application's hot-reloading should pick up this change. This code only runs in development mode and won't be in your production build. **Remember to remove it after testing.***

4.  **Execute the Test Script:** Paste the following code into your developer console and press Enter.

    ```javascript
    (async () => {
      console.log("--- Starting AGIS Rollback Test ---");

      // 1. Define mock data
      const testMauzaName = `test-rollback-${Date.now()}`;
      console.log(`Using test Mauza ID: ${testMauzaName}`);

      const mockGeoJson = {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [73.0, 29.0], [73.1, 29.0], [73.1, 29.1], [73.0, 29.1], [73.0, 29.0]
              ]
            ]
          }
        }]
      };

      // 2. Define invalid attributes (setting 'name' to null to fail security rules)
      const invalidDbfAttributes = {
        name: null, 
        tehsil: "Test Tehsil",
        district: "Test District",
      };

      try {
        // 3. Call the upload function, which is expected to fail
        console.log("Calling 'uploadMauzaData' with invalid data. Expecting an error...");
        await window.testUploadMauzaData(testMauzaName, mockGeoJson, invalidDbfAttributes);
        console.error("TEST FAILED: The upload function succeeded, but it was expected to fail.");

      } catch (error) {
        console.log("SUCCESS: The 'uploadMauzaData' function failed as expected.");
        console.log("Error message:", error.message);

        console.log("\n--- Verification Step ---");
        console.log("Now, manually check the following:");
        console.log("1. Firebase Console (Firestore): Verify that NO document with the ID", testMauzaName, "exists in the 'Mauzas' collection.");
        console.log("2. Firebase Console (Storage): Navigate to 'gis_data/mauzas/' and verify that NO folder named", testMauzaName, "exists. The rollback should have deleted it.");
        
        if (error.name === 'FirebaseError' && error.message.includes('Missing or insufficient permissions')) {
            console.log("\nRESULT: The test passed successfully. The Firestore write was blocked and the error was caught, implying the rollback was triggered.");
        } else {
            console.warn("\nRESULT: The function failed, but not due to a permission error. The rollback was likely still triggered, but the root cause might be different. Check the error details.");
        }
      }
    })();
    ```

5.  **Verify the Rollback:** Follow the instructions logged in the console. Go to your Firebase project and confirm that the test document was NOT created in Firestore and the test file was NOT left behind in Storage.
