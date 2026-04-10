import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { ref, deleteObject } from "firebase/storage";

/**
 * Deletes the user account from Firestore, Storage, and Firebase Auth.
 * Sequential execution ensures that data is removed while the user is still authenticated.
 */
export async function deleteAccountFromCloud(uid: string, password?: string) {
    const auth = await getFirebaseAuth();
    const db = await getFirebaseDb();
    const storage = await getFirebaseStorage();

    if (!auth || !auth.currentUser) {
        throw new Error("No authenticated user found. Please sign in again.");
    }
    
    const user = auth.currentUser;
    if (user.uid !== uid) {
        throw new Error("Unauthorized: UID mismatch.");
    }

    // 1. Re-authenticate if password is provided
    if (password && user.email) {
        try {
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
        } catch (error: any) {
            console.error("Re-authentication failed:", error);
            if (error.code === 'auth/wrong-password') {
                throw new Error("The password you entered is incorrect.");
            }
            throw new Error("Re-authentication failed. Please try again.");
        }
    }

    // 2. Delete Firestore data
    try {
        if (db) {
            const userDocRef = doc(db, "users", uid);
            await deleteDoc(userDocRef);
        }
    } catch (error: any) {
        console.error("Firestore data deletion failed:", error);
        // We ideally want to stop here so they can retry, but if we already re-authed, 
        // maybe it's a rule issue. Let's try to proceed with storage if possible?
        // Actually, stopping is better for full cleanup.
        throw new Error("Failed to delete user profile data.");
    }

    // 3. Delete Profile Photo from Storage
    try {
        if (storage) {
            const photoRef = ref(storage, `profile-photos/${uid}.jpg`);
            // We use catch to ignore if the file doesn't exist (404)
            await deleteObject(photoRef).catch(err => {
                if (err.code !== 'storage/object-not-found') {
                    throw err;
                }
            });
        }
    } catch (error: any) {
        console.warn("Storage cleanup skipped or failed:", error.message);
        // We don't block the whole process if photo deletion fails (profile might not have one)
    }

    // 4. Delete Firebase Auth Account LAST
    try {
        await deleteUser(user);
    } catch (error: any) {
        console.error("Auth account deletion failed:", error);
        if (error.code === 'auth/requires-recent-login') {
            throw new Error("For security, you must have logged in recently to delete your account. Please sign out and sign back in, then try again.");
        }
        throw new Error(error.message || "Failed to delete authentication account.");
    }

    return { success: true };
}
