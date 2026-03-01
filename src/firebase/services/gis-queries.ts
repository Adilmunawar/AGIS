'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, startAt, endAt, getDocs } from 'firebase/firestore';
import * as geofire from 'geofire-common';

import { ParcelMetadata } from '@/types/gis-schema';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Initialize a local Firebase app instance if none exists.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

/**
 * Finds all parcels within a given radius of a center point using Geohash queries.
 * This function is essential for building spatial search features like "find nearby properties."
 *
 * @param centerLat The latitude of the search center.
 * @param centerLng The longitude of the search center.
 * @param radiusInMeters The search radius in meters.
 * @returns A promise that resolves to an array of ParcelMetadata objects within the radius.
 */
export async function findParcelsInRadius(centerLat: number, centerLng: number, radiusInMeters: number): Promise<ParcelMetadata[]> {
    const center: geofire.Geopoint = [centerLat, centerLng];

    try {
        // 1. Calculate the geohash query bounds for the given radius.
        const bounds = geofire.geohashQueryBounds(center, radiusInMeters);

        // 2. Create a Firestore query for each bound.
        const promises = bounds.map((b) => {
            const parcelsCollection = collection(db, 'Parcels');
            const q = query(
                parcelsCollection,
                orderBy('geohash'),
                startAt(b[0]),
                endAt(b[1])
            );
            return getDocs(q);
        });

        // 3. Execute all queries concurrently and process the results.
        const snapshots = await Promise.all(promises);
        const matchingDocs: ParcelMetadata[] = [];

        for (const snap of snapshots) {
            for (const doc of snap.docs) {
                const parcel = doc.data() as ParcelMetadata;
                
                // Ensure parcel has a valid centroid before calculating distance.
                if (parcel.centroid) {
                    const parcelCentroid: geofire.Geopoint = [parcel.centroid.latitude, parcel.centroid.longitude];
                    
                    // 4. Filter results in memory to get precise circular distance.
                    // Geohash queries are on a grid, so this refinement is necessary.
                    const distanceInKm = geofire.distanceBetween(parcelCentroid, center);
                    const distanceInMeters = distanceInKm * 1000;

                    if (distanceInMeters <= radiusInMeters) {
                        matchingDocs.push(parcel);
                    }
                }
            }
        }

        return matchingDocs;

    } catch (error: any) {
        // 5. Comprehensive error handling.
        console.error("Spatial Query Failed:", error);

        // Emit a structured error for the global error listener to catch and display.
        const permissionError = new FirestorePermissionError({
            path: 'Parcels', // The query is on the 'Parcels' collection.
            operation: 'list', // A spatial query is a form of 'list' operation.
        });
        errorEmitter.emit('permission-error', permissionError);

        // Re-throw the error to allow the calling function to handle the failure state.
        throw error;
    }
}
