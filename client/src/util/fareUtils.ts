import { Leg } from '../static/query/tripQueryTypes';
import { CityKey } from './cityConfig';

/**
 * Official Fare Calculation Engine for Bengaluru Integrated Transit:
 * - BMRCL Namma Metro (Official token chart ₹10 to ₹60)
 * - BMTC Ordinary Bus (Stage-based ₹5 to ₹30)
 * - BMTC Vajra AC Bus (Stage-based ₹20 to ₹90)
 * - BMTC Vayu Vajra Airport Bus (Distance-based ₹150 to ₹270)
 * - Foot / Bicycle (Free: ₹0)
 */

export function calculateLegFare(leg: Leg, _city: CityKey = 'bengaluru'): number {
  const mode = leg.mode?.toLowerCase();

  // Walking and cycling are always free
  if (!mode || mode === 'foot' || mode === 'bicycle') {
    return 0;
  }

  const distanceKm = (leg.distance || 0) / 1000;
  const lineName = (leg.line?.publicCode || leg.line?.name || '').toUpperCase();

  // BMRCL Namma Metro Official Fare Chart
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

  // BMTC Bus
  if (mode === 'bus' || mode === 'coach') {
    // Vayu Vajra Airport Bus
    if (lineName.startsWith('KIA') || lineName.includes('AIRPORT') || lineName.includes('VAYU VAJRA')) {
      if (distanceKm <= 15) return 150;
      if (distanceKm <= 25) return 200;
      if (distanceKm <= 35) return 240;
      return 270;
    }

    // Vajra Volvo AC
    if (lineName.startsWith('V-') || lineName.includes('VAJRA') || lineName.includes('VOLVO')) {
      if (distanceKm <= 2) return 20;
      if (distanceKm <= 5) return 30;
      if (distanceKm <= 10) return 45;
      if (distanceKm <= 15) return 60;
      if (distanceKm <= 20) return 75;
      return 90;
    }

    // Ordinary BMTC
    if (distanceKm <= 2) return 5;
    if (distanceKm <= 4) return 10;
    if (distanceKm <= 6) return 15;
    if (distanceKm <= 10) return 20;
    if (distanceKm <= 15) return 25;
    return 30;
  }

  return 0;
}

export function calculateTripFare(legs: Leg[], city: CityKey = 'bengaluru'): number {
  if (!legs || legs.length === 0) return 0;
  return legs.reduce((total, leg) => total + calculateLegFare(leg, city), 0);
}

export function formatFare(amount: number, showFree = true): string {
  if (amount <= 0) return showFree ? 'Free' : '₹0';
  return `₹${amount}`;
}

