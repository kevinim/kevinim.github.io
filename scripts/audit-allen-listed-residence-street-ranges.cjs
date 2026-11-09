'use strict';
const fs=require('node:fs'),path=require('node:path');
const {matchAllenAddress}=require('../allen-lookup.js');
const district=require('../allen-address-schools.json');
const SAMPLES=[
{id:'allen-port-isabel',address:'1808 Port Isabel Dr, Allen, TX 75013',listing:'https://www.har.com/houses-for-sale-75013'},
{id:'allen-silver-trace',address:'2344 Silver Trace Ln, Allen, TX 75013',listing:'https://www.har.com/houses-for-sale-75013'},
{id:'allen-rolling-meadows',address:'816 Rolling Meadows Ct, Allen, TX 75013',listing:'https://www.har.com/allen/realestate/for_sale'},
{id:'allen-lakeway',address:'406 Lakeway Dr, Allen, TX 75013',listing:'https://www.har.com/houses-for-sale-75013'},
{id:'allen-exchange-place',address:'229 Exchange Pl, Allen, TX 75013',listing:'https://www.har.com/houses-for-sale-75013'},
{id:'allen-lunenburg',address:'2017 Lunenburg Dr, Allen, TX 75013',listing:'https://www.har.com/houses-for-sale-75013'}
];
function review(samples=SAMPLES,rows=district.rows){
 const seen=new Set();
 const records=samples.map(x=>{
  if(seen.has(x.address))throw Error('duplicate_public_address');
  seen.add(x.address);
  const match=matchAllenAddress(x.address,rows,true);
  return {id:x.id,address:x.address,publicListingSource:x.listing,
   source:'https://www.allenisd.org/page/findaschool',
   sourceSnapshotChecked:district.retrieved,
   sourceYear:district.schoolYear,
   sourceType:'official-street-number-range-table-cached',
   zoningRowFound:!!match,
   schoolCandidates:match?{elementary:match[2],middle:match[3],freshman:match[4],high:match[5]}:null,
   current2026_27Verified:false,independentlyVerifiedByLiveFinder:false,
   currentCampusPolygonsVerified:false,
   validationStatus:match?'SOURCE_TABLE_RANGE_MATCH_YEAR_UNVERIFIED':'RANGE_NOT_VERIFIED',
   action:'Check current official street lookup and building exceptions before enrollment/release'};
 });
 return {schemaVersion:1,district:'AISD',sampleCount:records.length,
  matchedRangeRecords:records.filter(x=>x.zoningRowFound).length,
  sourceAcademicYear:district.schoolYear,sourceYearKnown:!!district.schoolYear,
  independentLiveFinderConfirmed:false,individualEnrollmentVerified:false,
  currentCampusGisVerified:false,releaseDecision:'NO_GO',records};
}
if(require.main===module){
 try{
  const report=review();
  const output=path.resolve('artifacts/dfw-listed-residence/allen-official-street-range-public-listings.json');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log('ALLEN_PUBLIC_LISTED_HOUSE_STREET_RANGES '+JSON.stringify({
   addresses:report.sampleCount,matches:report.matchedRangeRecords,
   currentYearConfirmed:report.sourceYearKnown,release:report.releaseDecision,
   schools:report.records.map(x=>({id:x.id,match:x.zoningRowFound,schools:x.schoolCandidates}))}));
  if(report.matchedRangeRecords!==report.sampleCount)process.exitCode=1;
 }catch(e){console.error('ALLEN_PUBLIC_RANGE_ERROR '+e.message);process.exitCode=1}
}
module.exports={review,SAMPLES};
