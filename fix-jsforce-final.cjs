// Test the actual JSForce exports in Node.js
console.log('=== JSForce Analysis ===');

const jsforce = require('jsforce');
console.log('jsforce type:', typeof jsforce);
console.log('jsforce constructor name:', jsforce.constructor.name);
console.log('jsforce keys:', Object.keys(jsforce));
console.log('jsforce.Connection type:', typeof jsforce.Connection);

// Test different constructor patterns
console.log('\n=== Constructor Tests ===');

try {
  const conn1 = new jsforce();
  console.log('new jsforce(): SUCCESS - type:', typeof conn1);
} catch (e) {
  console.log('new jsforce(): FAILED -', e.message);
}

try {
  const conn2 = new jsforce.Connection();
  console.log('new jsforce.Connection(): SUCCESS - type:', typeof conn2);
} catch (e) {
  console.log('new jsforce.Connection(): FAILED -', e.message);
}

try {
  const Connection = jsforce.Connection;
  const conn3 = new Connection();
  console.log('new Connection(): SUCCESS - type:', typeof conn3);
} catch (e) {
  console.log('new Connection(): FAILED -', e.message);
}

// Show the correct pattern
console.log('\n=== Correct Pattern ===');
if (typeof jsforce.Connection === 'function') {
  console.log('Use: new jsforce.Connection(options)');
} else if (typeof jsforce === 'function') {
  console.log('Use: new jsforce(options)');
} else {
  console.log('JSForce structure unclear');
}