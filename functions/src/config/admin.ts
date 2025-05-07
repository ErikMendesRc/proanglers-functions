/**
 * @fileoverview Firebase Admin SDK Initialization and Export Configuration.
 * Initializes the Firebase Admin SDK and exports necessary instances and utilities
 * for use throughout the Cloud Functions application, using v2 standards.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2";
// Importe Timestamp diretamente do subpacote firestore
// Initialize Firebase Admin SDK only once.
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.info("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin SDK initialization failed:", error);
    // Depending on the error, you might want to throw it to stop function execution
    // or handle it differently based on your monitoring setup.
    process.exit(1); // Exit if initialization fails critically
  }
}

/** Firestore Database instance */
export const db = admin.firestore();

/** Firebase Authentication instance */
export const auth = admin.auth();

/** Firebase Admin SDK namespace (for FieldValue, etc.) */
export const adminInstance = admin;

/** Logger instance (compatible with v1 and v2) */
export const logger = functions.logger ?? console;

/**
 * Export Firestore Timestamp type directly for consistent usage across the application.
 * Use this alias 'Timestamp' whenever you need to refer to the Firestore Timestamp type.
 */
export type Timestamp = FirebaseFirestore.Timestamp;

// Add other exports if needed, e.g., Firebase Storage
// export const storage = admin.storage();

logger.info("Firebase configuration loaded.");
