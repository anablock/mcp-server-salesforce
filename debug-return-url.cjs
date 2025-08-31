#!/usr/bin/env node

// Test URL encoding/decoding issues with return URLs

const testUrls = [
    'http://localhost:3000/api/salesforce/callback',
    'http%3A//localhost%3A3000/api/salesforce/callback',
    encodeURIComponent('http://localhost:3000/api/salesforce/callback')
];

console.log('🔍 Testing URL Encoding/Decoding Issues\n');

testUrls.forEach((url, index) => {
    console.log(`Test ${index + 1}: ${url}`);
    console.log(`  Encoded: ${encodeURIComponent(url)}`);
    console.log(`  Decoded: ${decodeURIComponent(url)}`);
    console.log(`  Double encoded: ${encodeURIComponent(encodeURIComponent(url))}`);
    console.log(`  Double decoded: ${decodeURIComponent(decodeURIComponent(url))}`);
    console.log('');
});

// Test what happens with URL constructor
console.log('🔍 Testing URL Constructor Issues\n');

const baseUrl = 'http://l/';
const queryParams = '?connected=true&org_id=00DHn000002TnATMA0&connection_id=eb19473c-c584-4908-ac29-bb37acec81de';

console.log(`Observed result: ${baseUrl}${queryParams}`);
console.log('This suggests the return URL got truncated to just the protocol and first letter');
console.log('');

// Test possible truncation scenarios
const originalUrl = 'http://localhost:3000/api/salesforce/callback';
console.log('🔍 Possible Truncation Scenarios:');
console.log(`Original: ${originalUrl}`);
console.log(`First 8 chars: ${originalUrl.substring(0, 8)}`);
console.log(`Until first slash after protocol: ${originalUrl.split('/').slice(0, 3).join('/')}`);
console.log(`Protocol + first char of host: http://${originalUrl.split('//')[1][0]}/`);

// The last one matches our observation!
console.log('');
console.log('🎯 LIKELY CAUSE: URL truncation during processing');
console.log('The URL "http://localhost:3000/api/salesforce/callback" is getting truncated to "http://l/"');
console.log('This suggests an issue with string manipulation or URL parsing');