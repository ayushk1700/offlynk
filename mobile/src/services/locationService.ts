import * as Location from 'expo-location';

/**
 * Phase 1: Privacy-First Static Location Sharing
 * Captures GPS coordinates for sharing within the E2EE chat.
 */
export const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access location was denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp
  };
};

/**
 * Generates a OSM (OpenStreetMap) static link to prevent leaky Google Maps API calls.
 */
export const getMapLink = (lat: number, lon: number) => {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
};
