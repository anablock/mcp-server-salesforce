#!/usr/bin/env node

/**
 * Quick test script for Silver State Smiles patient appointment tools
 */

const https = require('https');

const SERVER_URL = 'web-production-1bd9.up.railway.app';
const BEARER_TOKEN = 'salesforce-mcp-token-2024';

async function testPatientTools() {
  console.log('🏥 Testing Silver State Smiles Patient Tools...\n');

  // Test 1: List available tools to confirm patient tools are loaded
  console.log('1. Checking available tools...');
  try {
    const toolsListRequest = {
      jsonrpc: "2.0",
      method: "tools/list",
      id: 1
    };

    const result = await makeRequest(toolsListRequest);
    
    if (result.data && result.data.result && result.data.result.tools) {
      const tools = result.data.result.tools;
      const patientTools = tools.filter(tool => 
        tool.name === 'create_patient_appointment' || 
        tool.name === 'search_patient_appointments'
      );
      
      console.log(`   📊 Total tools: ${tools.length}`);
      console.log(`   🏥 Patient tools found: ${patientTools.length}/2`);
      
      if (patientTools.length === 2) {
        console.log('   ✅ Both patient appointment tools are available!');
        patientTools.forEach(tool => {
          console.log(`   - ${tool.name}: ✅`);
        });
      } else {
        console.log('   ❌ Missing patient appointment tools');
        console.log('   Available tools:', tools.map(t => t.name));
      }
    } else {
      console.log('   ❌ Could not retrieve tools list');
      console.log('   Response:', result.data);
    }
  } catch (error) {
    console.log('   ❌ Tools list failed:', error.message);
  }

  // Test 2: Test search function (should return empty for new patient)
  console.log('\n2. Testing patient search...');
  try {
    const searchRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "search_patient_appointments",
        arguments: {
          searchTerm: "test@silverstatesmiles.com",
          searchType: "email",
          includeUpcoming: true
        }
      },
      id: 2
    };

    const result = await makeRequest(searchRequest);
    
    if (result.data && result.data.result) {
      console.log('   ✅ Patient search working!');
      console.log(`   📊 Found ${result.data.result.totalFound || 0} existing appointments`);
    } else if (result.data && result.data.error) {
      console.log('   ❌ Search failed:', result.data.error.message);
    } else {
      console.log('   ❌ Unexpected search response:', result.data);
    }
  } catch (error) {
    console.log('   ❌ Patient search failed:', error.message);
  }

  // Test 3: Test appointment creation
  console.log('\n3. Testing appointment creation...');
  try {
    const appointmentData = {
      patientFirstName: "Test",
      patientLastName: "Patient",
      patientEmail: "test@silverstatesmiles.com",
      patientPhone: "555-TEST",
      serviceType: "General Dentistry",
      location: "Las Vegas - Sahara 7545 W Sahara Ave #200, Las Vegas, NV 89117",
      appointmentDateTime: "2025-12-15T10:00:00-08:00",
      painLevel: 1,
      chiefComplaint: "Test appointment",
      paymentMethod: "Test",
      specialNotes: "This is a test appointment - please disregard"
    };

    const createRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "create_patient_appointment",
        arguments: appointmentData
      },
      id: 3
    };

    const result = await makeRequest(createRequest);
    
    if (result.data && result.data.result && result.data.result.success) {
      console.log('   ✅ Appointment creation successful!');
      console.log(`   📋 Record ID: ${result.data.result.recordId}`);
      console.log(`   👤 Patient: ${result.data.result.appointmentDetails.patientName}`);
      console.log(`   🏥 Service: ${result.data.result.appointmentDetails.service}`);
    } else if (result.data && result.data.error) {
      console.log('   ❌ Appointment creation failed:', result.data.error.message);
    } else if (result.data && result.data.result && !result.data.result.success) {
      console.log('   ❌ Appointment creation failed:', result.data.result.error);
    } else {
      console.log('   ❌ Unexpected creation response:', result.data);
    }
  } catch (error) {
    console.log('   ❌ Appointment creation failed:', error.message);
  }

  console.log('\n🎯 Test Complete!');
  console.log('If all tests passed, Silver State Smiles voice AI is ready for VAPI integration.');
}

async function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: SERVER_URL,
      port: 443,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Run the tests
testPatientTools().catch(console.error);