/* P40: DFW commute cost model. Pure, dependency-free; not yet wired into index.html.
 * Toll amounts are entered/verified for a specific route. OSRM does NOT quote NTTA tolls.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CommuteCostModel = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const RATES = Object.freeze({
    tolltag: 1,
    zipcash: 2,
    zipcash_autopay: 1.5
  });
  const APPROVED_MODES = Object.keys(RATES);
  function decimal(value, field, { min = 0, max = 100000, integer = false } = {}) {
    if (value === null || value === undefined || value === '') throw new TypeError(field + ' is required');
    if (typeof value !== 'number' && typeof value !== 'string') throw new TypeError(field + ' must be numeric');
    const v = Number(value);
    if (!Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
      throw new RangeError(field + ' outside allowed range');
    }
    return v;
  }
  function usd(cents) {
    return cents === null ? null : Math.round(cents) / 100;
  }
  function cents(value, field) {
    return Math.round(decimal(value, field, {max:10000}) * 100);
  }
  function knownLeg(value, field, used) {
    if (!used) return 0;
    if (value === null || value === undefined || value === '') return null;
    return cents(value, field);
  }
  function addKnown(a, b) {
    return a === null || b === null ? null : a + b;
  }
  function monthly(centsPerDay, days) {
    return centsPerDay === null ? null : Math.round(centsPerDay * days);
  }
  // Strict booleans prevent silently presenting an unquoted toll road as free.
  function roadUse(value, field) {
    if (typeof value !== 'boolean') throw new TypeError(field + ' must be explicitly true or false');
    return value;
  }

  /**
   * Required scenario fields:
   * { daysPerMonth, paymentMode, nttaRoadsUsed, expressLanesUsed,
   *   outboundMiles, returnMiles, milesPerGallon, fuelPricePerGallon,
   *   parkingPerDayUsd }
   *
   * When nttaRoadsUsed=true, outboundNttaTollTagUsd and returnNttaTollTagUsd
   * are explicitly supplied *per direction*, from a quote or user estimate.
   * When expressLanesUsed=true, outboundExpressUsd and returnExpressUsd are
   * user-entered actual/dynamic price estimates and are NEVER multiplied by
   * NTTA ZipCash rules.
   */
  function calculateMonthlyCommute(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('scenario object required');
    }
    const days = decimal(input.daysPerMonth, 'daysPerMonth', {max:31,integer:true});
    const paymentMode = input.paymentMode;
    if (!APPROVED_MODES.includes(paymentMode)) throw new RangeError('unsupported paymentMode');
    const nttaUsed = roadUse(input.nttaRoadsUsed, 'nttaRoadsUsed');
    const expressUsed = roadUse(input.expressLanesUsed, 'expressLanesUsed');
    const outMiles = decimal(input.outboundMiles, 'outboundMiles', {max:500});
    const returnMiles = decimal(input.returnMiles, 'returnMiles', {max:500});
    const mpg = decimal(input.milesPerGallon, 'milesPerGallon', {min:0.01,max:300});
    const gasoline = decimal(input.fuelPricePerGallon, 'fuelPricePerGallon', {max:50});
    const parking = cents(input.parkingPerDayUsd, 'parkingPerDayUsd');

    const outNtta = knownLeg(input.outboundNttaTollTagUsd, 'outboundNttaTollTagUsd', nttaUsed);
    const inNtta = knownLeg(input.returnNttaTollTagUsd, 'returnNttaTollTagUsd', nttaUsed);
    const outExpress = knownLeg(input.outboundExpressUsd, 'outboundExpressUsd', expressUsed);
    const inExpress = knownLeg(input.returnExpressUsd, 'returnExpressUsd', expressUsed);

    const nttaTagPerDay = addKnown(outNtta, inNtta);
    const nttaPerDay = nttaTagPerDay === null ? null : Math.round(nttaTagPerDay * RATES[paymentMode]);
    const expressPerDay = addKnown(outExpress, inExpress);
    const tollPerDay = addKnown(nttaPerDay, expressPerDay);
    const fuelPerMonth = Math.round((outMiles + returnMiles) * days / mpg * gasoline * 100);
    const tollPerMonth = monthly(tollPerDay, days);
    const parkingPerMonth = parking * days;
    const missingQuotes = [];
    if (nttaUsed && outNtta === null) missingQuotes.push('outboundNttaTollTagUsd');
    if (nttaUsed && inNtta === null) missingQuotes.push('returnNttaTollTagUsd');
    if (expressUsed && outExpress === null) missingQuotes.push('outboundExpressUsd');
    if (expressUsed && inExpress === null) missingQuotes.push('returnExpressUsd');
    const fullMonth = tollPerMonth === null ? null : tollPerMonth + fuelPerMonth + parkingPerMonth;

    return {
      status: fullMonth === null ? 'INCOMPLETE_QUOTE' : 'ESTIMATE',
      units: 'USD',
      daysPerMonth: days,
      paymentMode,
      components: {
        nttaPerMonthUsd: usd(monthly(nttaPerDay, days)),
        expressPerMonthUsd: usd(monthly(expressPerDay, days)),
        tollPerMonthUsd: usd(tollPerMonth),
        fuelPerMonthUsd: usd(fuelPerMonth),
        parkingPerMonthUsd: usd(parkingPerMonth),
        totalPerMonthUsd: usd(fullMonth),
        totalPerYearUsd: fullMonth === null ? null : usd(fullMonth * 12)
      },
      missingQuotes,
      disclosures: [
        'Tolls are user-entered route-specific amounts; automatic toll route matching is not implemented.',
        'NTTA ZipCash is estimated at 2x TollTag; ZipCash autopay is estimated at 1.5x TollTag. Per-gantry rounding can differ.',
        'TEXpress uses separate dynamic/operator pricing and is never multiplied by NTTA payment-mode factors.',
        'Fuel and parking assumptions are user-entered. Time, congestion, maintenance, depreciation and insurance are excluded.',
        'Annual cost projects this monthly scenario over twelve months; it is not a guaranteed calendar-year expense.'
      ]
    };
  }

  // For scenarios with tolls unknown, time-value decisions remain unknown.
  function compareRouteCosts(first, second, options = {}) {
    const a = calculateMonthlyCommute(first);
    const b = calculateMonthlyCommute(second);
    if (a.daysPerMonth !== b.daysPerMonth) throw new RangeError('compare the same commute days');
    let minutesSavedPerTrip = null;
    if (options.minutesSavedPerRoundTrip !== undefined && options.minutesSavedPerRoundTrip !== null) {
      minutesSavedPerTrip = decimal(options.minutesSavedPerRoundTrip, 'minutesSavedPerRoundTrip', {max:1440});
    }
    const aTotal = a.components.totalPerMonthUsd, bTotal = b.components.totalPerMonthUsd;
    const premiumPerMonthUsd = aTotal === null || bTotal === null ? null : Math.round((aTotal - bTotal) * 100) / 100;
    const minutesSavedPerMonth = minutesSavedPerTrip === null ? null : minutesSavedPerTrip * a.daysPerMonth;
    const dollarsPerHourSaved = premiumPerMonthUsd === null || minutesSavedPerMonth === null ||
      minutesSavedPerMonth === 0 ? null : Math.round((premiumPerMonthUsd / (minutesSavedPerMonth / 60)) * 100) / 100;
    return { first:a, second:b, premiumPerMonthUsd, minutesSavedPerMonth, dollarsPerHourSaved,
      caveat:'No route time estimates are inferred. Pass observed/verified round-trip minutes saved explicitly.' };
  }
  return Object.freeze({calculateMonthlyCommute, compareRouteCosts, APPROVED_MODES});
});
