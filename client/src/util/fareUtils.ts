import { Leg } from '../static/query/tripQueryTypes';

/**
 * Official Fare Calculation Engine for Bengaluru Integrated Transit:
 * - BMTC Ordinary Bus Fare (Stage-based ₹5 to ₹30)
 * - BMTC Vajra AC Bus Fare (Stage-based ₹20 to ₹90)
 * - BMTC Vayu Vajra Airport Bus Fare (Distance-based ₹150 to ₹270)
 * - BMRCL Namma Metro Fare (Official token chart ₹10 to ₹60)
 * - Foot / Bicycle (Free: ₹0)
 */

export function calculateLegFare(leg: Leg): number {
  const mode = leg.mode?.toLowerCase();

  // Walking and cycling are always free
  if (!mode || mode === 'foot' || mode === 'bicycle') {
    return 0;
  }

  const distanceKm = (leg.distance || 0) / 1000;

  // Metro / Subway (BMRCL Namma Metro)
  if (mode === 'metro' || mode === 'subway') {
    if (distanceKm <= 2) return 10;
    if (distanceKm <= 4) return 15;
    if (distanceKm <= 6) return 20;
    if (distanceKm <= 8) return 25;
    if (distanceKm <= 10) return 30;
    if (distanceKm <= 12) return 35;
    if (distanceKm <= 15) return 40;
    if (distanceKm <= 18) return 45;
    if (distanceKm <= 21) return 50;
    if (distanceKm <= 24) return 55;
    return 60;
  }

  // Bus (BMTC)
  if (mode === 'bus' || mode === 'coach') {
    const code = (leg.line?.publicCode || leg.line?.name || '').toUpperCase();

    // Vayu Vajra Airport Services (e.g. KIA-4, KIA-8, etc.)
    if (code.startsWith('KIA-') || code.includes('AIRPORT')) {
      if (distanceKm <= 15) return 150;
      if (distanceKm <= 25) return 200;
      if (distanceKm <= 35) return 240;
      return 270;
    }

    // Vajra Volvo AC Services (e.g. V-500D, V-335E)
    if (code.startsWith('V-') || code.includes('VAJRA')) {
      if (distanceKm <= 2) return 20;
      if (distanceKm <= 4) return 25;
      if (distanceKm <= 6) return 30;
      if (distanceKm <= 8) return 35;
      if (distanceKm <= 10) return 40;
      if (distanceKm <= 12) return 45;
      if (distanceKm <= 14) return 50;
      if (distanceKm <= 16) return 55;
      if (distanceKm <= 18) return 60;
      if (distanceKm <= 20) return 65;
      if (distanceKm <= 22) return 70;
      if (distanceKm <= 24) return 75;
      if (distanceKm <= 26) return 80;
      if (distanceKm <= 28) return 85;
      return 90;
    }

    // BMTC Ordinary / Non-AC Stage Fare (Standard city bus)
    if (distanceKm <= 2) return 5;
    if (distanceKm <= 4) return 10;
    if (distanceKm <= 6) return 15;
    if (distanceKm <= 8) return 18;
    if (distanceKm <= 10) return 20;
    if (distanceKm <= 12) return 22;
    if (distanceKm <= 14) return 23;
    if (distanceKm <= 16) return 24;
    if (distanceKm <= 18) return 25;
    if (distanceKm <= 20) return 26;
    if (distanceKm <= 22) return 28;
    return 30;
  }

  // Indian Railways Suburban / Passenger
  if (mode === 'rail') {
    if (distanceKm <= 20) return 10;
    if (distanceKm <= 45) return 15;
    return 30;
  }

  // Taxi / Auto-rickshaw fallback
  if (mode === 'car' || mode === 'taxi') {
    // Bengaluru Auto base ₹30 for first 2 km, ₹15 per subsequent km
    return Math.round(Math.max(30, 30 + (distanceKm - 2) * 15));
  }

  return 0;
}

export function calculateTripFare(legs: Leg[]): number {
  if (!legs || legs.length === 0) return 0;
  return legs.reduce((total, leg) => total + calculateLegFare(leg), 0);
}

export function formatFare(fare: number, isLeg = false): string {
  if (fare === 0) {
    return isLeg ? 'Free (₹0)' : '₹0';
  }
  return `₹${fare}`;
}

