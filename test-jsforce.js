// Test JSForce import patterns
console.log('Testing JSForce imports...');

try {
  // Method 1: require
  const jsforce1 = require('jsforce');
  console.log('require("jsforce"):', typeof jsforce1, jsforce1.constructor.name);
  console.log('jsforce1.Connection:', typeof jsforce1.Connection);
  
  // Method 2: import
  import('jsforce').then(jsforce2 => {
    console.log('import("jsforce"):', typeof jsforce2, typeof jsforce2.default);
    console.log('jsforce2.default.Connection:', typeof jsforce2.default?.Connection);
    console.log('jsforce2.Connection:', typeof jsforce2.Connection);
    
    // Test constructor
    try {
      const conn1 = new jsforce1.Connection();
      console.log('new jsforce1.Connection(): SUCCESS');
    } catch (e) {
      console.log('new jsforce1.Connection(): ERROR -', e.message);
    }
    
    try {
      const conn2 = new jsforce1();
      console.log('new jsforce1(): SUCCESS');
    } catch (e) {
      console.log('new jsforce1(): ERROR -', e.message);
    }
  });
  
} catch (e) {
  console.error('Import error:', e.message);
}