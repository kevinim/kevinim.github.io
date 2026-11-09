// Classify transport-only source outages. Never turn a data or feeder mismatch
// into a success. Unavailable source != validated assignment.
export function isTransientOfficialSourceFailure(error){
 const nested=Array.isArray(error?.cause?.errors)?error.cause.errors:[];
 const text=[error?.message,error?.name,error?.cause?.message,error?.cause?.code,
  ...nested.flatMap(x=>[x?.code,x?.message])]
  .filter(Boolean).join(' ');
 return /fetch failed|ETIMEDOUT|ENETUNREACH|ECONNRESET|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|AbortError|TimeoutError|HTTP (?:429|50[0234])\b/i.test(text);
}
