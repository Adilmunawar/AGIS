'use client';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { MauzaMetadata } from '@/types/gis-schema';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { FeatureCollection } from 'geojson';
import * as turf from '@turf/turf';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export async function uploadMauzaAndParcels(
    mauzaName: string,
    boundaryData: FeatureCollection | null,
    parcelsData: FeatureCollection | null
) {
    const mauzaId = mauzaName.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const storagePromises: Promise<any>[] = [];
    const storagePaths: string[] = [];

    let boundaryUrl = '';
    let parcelsUrl = '';
    let metadataForError: Partial<MauzaMetadata> = { id: mauzaId, name: mauzaName };

    try {
        if (boundaryData) {
            const path = `gis_data/mauzas/${mauzaId}/boundary.json`;
            storagePaths.push(path);
            const storageRef = ref(storage, path);
            storagePromises.push(
                uploadString(storageRef, JSON.stringify(boundaryData), 'raw', { contentType: 'application/json' })
                    .then(() => getDownloadURL(storageRef))
                    .then(url => { boundaryUrl = url; })
            );
        }

        if (parcelsData) {
            const path = `gis_data/mauzas/${mauzaId}/parcels.json`;
            storagePaths.push(path);
            const storageRef = ref(storage, path);
            storagePromises.push(
                uploadString(storageRef, JSON.stringify(parcelsData), 'raw', { contentType: 'application/json' })
                    .then(() => getDownloadURL(storageRef))
                    .then(url => { parcelsUrl = url; })
            );
        }

        await Promise.all(storagePromises);
        
        const mauzaDocRef = doc(db, 'Mauzas', mauzaId);

        const attributes = parcelsData?.features[0]?.properties || boundaryData?.features[0]?.properties || {};
        const bboxData = parcelsData || boundaryData;
        const boundingBox = bboxData ? turf.bbox(bboxData) as [number, number, number, number] : [0,0,0,0];

        const metadata: MauzaMetadata = {
            id: mauzaId,
            name: mauzaName,
            tehsil: attributes.tehsil || 'Unknown',
            district: attributes.district || 'Unknown',
            hudbust_no: attributes.hudbust_no || 'N/A',
            boundingBox,
            geometryUrl: boundaryUrl,
            parcelsGeometryUrl: parcelsUrl,
            totalParcels: parcelsData?.features.length || 0,
            createdAt: Timestamp.now(),
        };
        metadataForError = metadata;

        await setDoc(mauzaDocRef, metadata);

        return { success: true, docId: mauzaId };

    } catch (error: any) {
        // Rollback storage uploads
        for (const path of storagePaths) {
            const storageRef = ref(storage, path);
            try {
                await deleteObject(storageRef);
                console.log(`Successfully rolled back storage file: ${path}`);
            } catch (rollbackError: any) {
                if (rollbackError.code !== 'storage/object-not-found') {
                    console.error(`CRITICAL: Failed to rollback storage file ${path}.`, rollbackError);
                }
            }
        }
        
        const permissionError = new FirestorePermissionError({
            path: `Mauzas/${mauzaId}`,
            operation: 'create',
            requestResourceData: metadataForError,
        });
        errorEmitter.emit('permission-error', permissionError);

        throw error;
    }
}
