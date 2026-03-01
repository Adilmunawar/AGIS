'use client';

// Firebase imports - initialize a self-contained instance as per instruction
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Domain-specific imports
import { MauzaMetadata } from '@/types/gis-schema';
import { geohashForLocation } from 'geofire-common';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { FeatureCollection } from 'geojson';

// Initialize a local Firebase app instance if none exists, to get db and storage.
// This follows the explicit instruction to use firebase/config.ts.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);


// Helper to calculate bounding box from a GeoJSON FeatureCollection
const calculateBoundingBox = (geojson: FeatureCollection): [number, number, number, number] => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    geojson.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach(coord => {
                const [x, y] = coord;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            });
        } else if (feature.geometry.type === 'MultiPolygon') {
             feature.geometry.coordinates.forEach(polygon => {
                polygon[0].forEach(coord => {
                    const [x, y] = coord;
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                });
            });
        }
    });
    
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
        throw new Error("Could not calculate a valid bounding box. The GeoJSON may be empty or invalid.");
    }
    
    return [minX, minY, maxX, maxY];
};

/**
 * Handles the full ETL process for a single Mauza shapefile.
 * 1. Extracts geometry and attributes.
 * 2. Transforms geometry to minified GeoJSON and uploads to Cloud Storage.
 * 3. Loads metadata, including the geometry URL and a geohash, into Firestore.
 * Includes an automatic rollback mechanism for the Storage upload if the Firestore write fails.
 * 
 * @param mauzaName The designated name for the Mauza, used for ID and path generation.
 * @param geoJsonFeatureCollection The full GeoJSON FeatureCollection representing the Mauza boundary.
 * @param dbfAttributes An object containing attributes from the shapefile's .dbf file.
 * @returns A promise that resolves with the new document ID and storage path.
 */
export async function uploadMauzaData(mauzaName: string, geoJsonFeatureCollection: any, dbfAttributes: any) {
    const mauzaId = mauzaName.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const storagePath = `gis_data/mauzas/${mauzaId}/boundary.json`;
    const storageRef = ref(storage, storagePath);

    let metadataForError: Partial<MauzaMetadata> = { id: mauzaId };

    try {
        // --- 1. TRANSFORM & LOAD (to Storage) ---
        const geoJsonString = JSON.stringify(geoJsonFeatureCollection);
        await uploadString(storageRef, geoJsonString, 'raw', { contentType: 'application/json' });
        const geometryUrl = await getDownloadURL(storageRef);

        // --- 2. TRANSFORM (for Firestore) ---
        const boundingBox = calculateBoundingBox(geoJsonFeatureCollection);
        const centerLat = (boundingBox[1] + boundingBox[3]) / 2;
        const centerLng = (boundingBox[0] + boundingBox[2]) / 2;
        const geohash = geohashForLocation([centerLat, centerLng]);
        const mauzaDocRef = doc(db, 'Mauzas', mauzaId);

        const metadata: MauzaMetadata = {
            id: mauzaId,
            name: dbfAttributes.name || mauzaName,
            tehsil: dbfAttributes.tehsil || 'Unknown',
            district: dbfAttributes.district || 'Unknown',
            hudbust_no: dbfAttributes.hudbust_no || 'N/A',
            boundingBox,
            geometryUrl,
            totalParcels: dbfAttributes.totalParcels || geoJsonFeatureCollection.features.length,
            createdAt: Timestamp.now(),
        };
        metadataForError = metadata; // For use in catch block

        // --- 3. LOAD (to Firestore) ---
        await setDoc(mauzaDocRef, metadata);

        return { success: true, docId: mauzaId, storagePath };

    } catch (error: any) {
        // --- 4. RELIABILITY & ROLLBACK ---
        console.error(`Failed to upload Mauza data for '${mauzaId}'. Initiating rollback.`, error);
        
        try {
            await getDownloadURL(storageRef); // Check if file exists
            await deleteObject(storageRef);
            console.log(`Successfully rolled back storage file: ${storagePath}`);
        } catch (rollbackError: any) {
            if (rollbackError.code !== 'storage/object-not-found') {
                console.error(`CRITICAL: Failed to rollback storage file ${storagePath}. Manual cleanup may be required.`, rollbackError);
            }
        }
        
        // Broadcast a structured error to the UI via the global emitter.
        const permissionError = new FirestorePermissionError({
            path: `Mauzas/${mauzaId}`,
            operation: 'create',
            requestResourceData: metadataForError,
        });
        errorEmitter.emit('permission-error', permissionError);

        throw error;
    }
}
