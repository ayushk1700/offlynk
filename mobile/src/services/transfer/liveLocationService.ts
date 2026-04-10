import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { sendMessage } from '../messageService';

const LOCATION_TASK_NAME = 'background-location-task';

// Module-level variable to hold the active recipient during a sharing session.
// Must be set before startLocationUpdatesAsync is called.
let _activeRecipientId: string | null = null;

/**
 * IMPORTANT: TaskManager.defineTask MUST be called at the root module level
 * (i.e., not inside a function) so Expo can register it before the app is ready.
 * This handles location updates arriving from the OS background task.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('[LiveLoc] Background task error:', error.message);
    return;
  }

  if (!_activeRecipientId) {
    console.warn('[LiveLoc] Received location update but no active recipient set.');
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  const loc = locations[0];
  if (!loc) return;

  try {
    // Send encrypted location payload over existing Signal session
    const payload = {
      type: 'location',
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
    };
    await sendMessage(_activeRecipientId, JSON.stringify(payload));
    console.log(`[LiveLoc] Sent location to ${_activeRecipientId}`);
  } catch (err) {
    console.error('[LiveLoc] Failed to send location:', err);
  }
});

/**
 * Phase 2: Live Location Sharing (E2EE)
 * Implements persistent, background coordinate streaming over the mesh.
 */
export const startLiveSharing = async (recipientId: string) => {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Background location permission required');

  _activeRecipientId = recipientId;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60000,  // Update every minute to save battery
    distanceInterval: 10, // Or every 10 meters
    foregroundService: {
      notificationTitle: 'OffLynk Live Sharing',
      notificationBody: 'Your location is being shared securely over the mesh.',
      notificationColor: '#38BDF8',
    },
  });

  console.log(`[LiveLoc] Sharing started with ${recipientId}`);
};

export const stopLiveSharing = async () => {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  _activeRecipientId = null;
  console.log('[LiveLoc] Sharing stopped.');
};
