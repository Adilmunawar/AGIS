/**
 * @fileoverview Defines the core TypeScript interfaces for the AGIS cadastral data model.
 * This schema separates lightweight, searchable metadata from heavy geometry data,
 * which is stored externally in Firebase Cloud Storage to avoid Firestore document size limits.
 */

import type { Timestamp, GeoPoint } from 'firebase/firestore';

/**
 * Represents the searchable metadata for a "Mauza" (a village or administrative area).
 * The heavy geometry for the boundary is stored separately in Firebase Cloud Storage as a
 * minified GeoJSON file, referenced by the `geometryUrl`.
 */
export interface MauzaMetadata {
  /** A unique identifier for the Mauza document. */
  id: string;
  /** The official name of the Mauza (e.g., "Chak 185/7-R"). */
  name: string;
  /** The Tehsil (sub-district) this Mauza belongs to. */
  tehsil: string;
  /** The District this Mauza belongs to. */
  district: string;
  /** The official government-assigned Hudbust number. */
  hudbust_no: string;
  /**
   * The geographic bounding box of the Mauza.
   * Stored as an array of four numbers: [West, South, East, North].
   */
  boundingBox: [number, number, number, number];
  /**
   * The URL pointing to the minified GeoJSON file in Firebase Cloud Storage
   * that contains the detailed boundary geometry for this Mauza.
   */
  geometryUrl: string;
  /**
   * The URL pointing to the minified GeoJSON file in Firebase Cloud Storage
   * that contains the geometry for all parcels within this Mauza.
   */
  parcelsGeometryUrl?: string;
  /** The total number of individual parcels recorded within this Mauza. */
  totalParcels: number;
  /** A Firestore timestamp indicating when this Mauza record was created. */
  createdAt: Timestamp;
}

/**
 * Represents the searchable metadata for an individual land parcel.
 * The heavy geometry for the parcel's polygon is stored separately in Firebase
 * Cloud Storage as a minified GeoJSON file, referenced by the `geometryUrl`.
 */
export interface ParcelMetadata {
  /** A unique identifier for the Parcel document. */
  id: string;
  /** A reference to the ID of the parent Mauza this parcel belongs to. */
  mauza_ref: string;
  /** The official plot number or identifier for this parcel. */
  plot_no: string | number;
  /** The designated land use for the parcel (e.g., "Residential", "Commercial", "Agricultural"). */
  land_use: string;
  /** The total area of the parcel in square meters. */
  area_sqm: number;
  /**
   * The geographic center point of the parcel. This is a native Firestore GeoPoint,
   * useful for simple map markers and distance calculations.
   */
  centroid: GeoPoint;
  /**
   * A Geohash string representing the parcel's location. This is crucial for performing
   * efficient geographic radius queries directly in Firestore.
   */
  geohash: string;
  /**
   * The URL pointing to the minified GeoJSON file in Firebase Cloud Storage
   * that contains the detailed boundary geometry for this specific parcel.
   */
  geometryUrl: string;
}
