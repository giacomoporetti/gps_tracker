import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Haversine formula to calculate distance between two GPS points
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate total distance from array of positions
export function calculateTotalDistance(positions: { lat: number; lon: number }[]): number {
  if (positions.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < positions.length; i++) {
    totalDistance += haversineDistance(
      positions[i-1].lat, positions[i-1].lon,
      positions[i].lat, positions[i].lon
    );
  }
  
  return totalDistance;
}

// Format distance for display
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(2)}km`;
}

// Check if a point is on the left side of a line (defined by two points)
export function isPointOnLeftSide(point: { lat: number; lon: number }, lineStart: { lat: number; lon: number }, lineEnd: { lat: number; lon: number }): boolean {
  // Using cross product to determine which side of the line the point is on
  const crossProduct = (lineEnd.lon - lineStart.lon) * (point.lat - lineStart.lat) - (lineEnd.lat - lineStart.lat) * (point.lon - lineStart.lon);
  return crossProduct > 0;
}

// Check if a point crosses a line between two positions
export function checkLineCrossing(
  prevPos: { lat: number; lon: number },
  currentPos: { lat: number; lon: number },
  lineStart: { lat: number; lon: number },
  lineEnd: { lat: number; lon: number }
): boolean {
  const prevOnLeft = isPointOnLeftSide(prevPos, lineStart, lineEnd);
  const currentOnLeft = isPointOnLeftSide(currentPos, lineStart, lineEnd);
  
  // Line crossing occurs when the point moves from one side to the other
  return prevOnLeft !== currentOnLeft;
}

// Check if crossing is in the correct direction (left to right)
export function checkCorrectDirectionCrossing(
  prevPos: { lat: number; lon: number },
  currentPos: { lat: number; lon: number },
  lineStart: { lat: number; lon: number },
  lineEnd: { lat: number; lon: number }
): boolean {
  const prevOnLeft = isPointOnLeftSide(prevPos, lineStart, lineEnd);
  const currentOnLeft = isPointOnLeftSide(currentPos, lineStart, lineEnd);
  
  // Correct direction: from left to right (prevOnLeft = true, currentOnLeft = false)
  return prevOnLeft && !currentOnLeft;
}

// Check if crossing is in the opposite direction (right to left)
export function checkOppositeDirectionCrossing(
  prevPos: { lat: number; lon: number },
  currentPos: { lat: number; lon: number },
  lineStart: { lat: number; lon: number },
  lineEnd: { lat: number; lon: number }
): boolean {
  const prevOnLeft = isPointOnLeftSide(prevPos, lineStart, lineEnd);
  const currentOnLeft = isPointOnLeftSide(currentPos, lineStart, lineEnd);
  
  // Opposite direction: from right to left (prevOnLeft = false, currentOnLeft = true)
  return !prevOnLeft && currentOnLeft;
}
