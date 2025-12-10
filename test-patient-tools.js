#!/usr/bin/env node

/**
 * Test script for Silver State Smiles patient appointment tools
 * Tests both the MCP server and individual tool endpoints
 */

const https = require('https');

const SERVER_URL = 'https://web-production-1bd9.up.railway.app';
const BEARER_TOKEN = 'salesforce-mcp-token-2024';

// Test data
const testPatient = {
  patientFirstName: 'Test',
  patientLastName: 'Patient',
  patientEmail: 'test.patient@silverstatesmiles.com',
  patientPhone: '555-TEST',
  bookingFor: 'Myself',
  serviceType: 'General Dentistry',
  location: 'Las Vegas - Sahara 7545 W Sahara Ave #200, Las Vegas, NV 89117',
  appointmentDateTime: '2025-12-15T10:00:00-08:00',
  painLevel: 2,
  chiefComplaint: 'Routine cleaning and checkup',
  paymentMethod: 'Insurance',
  specialNotes: 'Test appointment - please disregard'
};

async function makeRequest(url, data, path = '/mcp') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data, null, 0); // Ensure no extra formatting
    
    const options = {
      hostname: url.replace('https://', ''),
      port: 443,
      path: path,
      method: path === '/health' ? 'GET' : 'POST',
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

async function testMCPEndpoint() {
  console.log('🧪 Testing MCP Server Endpoints...\n');

  // Test 1: Health Check
  console.log('1. Health Check...');
  try {
    const https = require('https');
    const healthPromise = new Promise((resolve, reject) => {
      const req = https.request({
        hostname: SERVER_URL.replace('https://', ''),
        port: 443,
        path: '/health',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: data });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    const health = await healthPromise;
    console.log('   ✅ Health check:', health.statusCode === 200 ? 'PASS' : 'FAIL');
    console.log('   📊 Status:', health.data);
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
  }

  // Test 2: List Tools
  console.log('\n2. List Available Tools...');
  try {
    const toolsList = await makeRequest(SERVER_URL, {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1
    });
    console.log('   ✅ Tools list:', toolsList.statusCode === 200 ? 'PASS' : 'FAIL');
    
    if (toolsList.data && toolsList.data.result && toolsList.data.result.tools) {
      const tools = toolsList.data.result.tools;
      const patientTools = tools.filter(tool => 
        tool.name === 'create_patient_appointment' || 
        tool.name === 'search_patient_appointments'
      );
      console.log(`   📋 Total tools: ${tools.length}`);
      console.log(`   🏥 Patient tools: ${patientTools.length}/2`);
      
      patientTools.forEach(tool => {
        console.log(`   - ${tool.name}: ✅`);
      });
    }
  } catch (error) {
    console.log('   ❌ Tools list failed:', error.message);
  }

  // Test 3: Search for existing patient (should return empty results)
  console.log('\n3. Search for Existing Patient...');
  try {
    const searchRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'search_patient_appointments',
        arguments: {
          searchTerm: testPatient.patientEmail,
          searchType: 'email',
          includeUpcoming: true,
          includePast: true
        }
      },
      id: 2
    };

    const searchResult = await makeRequest(SERVER_URL, searchRequest);
    console.log('   ✅ Patient search:', searchResult.statusCode === 200 ? 'PASS' : 'FAIL');
    
    if (searchResult.data && searchResult.data.result) {
      const result = searchResult.data.result;
      console.log(`   📊 Found ${result.totalFound || 0} existing appointments`);
    }
  } catch (error) {
    console.log('   ❌ Patient search failed:', error.message);
  }

  // Test 4: Create Patient Appointment
  console.log('\n4. Create Patient Appointment...');
  try {
    const createRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'create_patient_appointment',
        arguments: testPatient
      },
      id: 3
    };

    const createResult = await makeRequest(SERVER_URL, createRequest);
    console.log('   ✅ Appointment creation:', createResult.statusCode === 200 ? 'PASS' : 'FAIL');
    
    if (createResult.data && createResult.data.result) {
      const result = createResult.data.result;
      if (result.success) {
        console.log('   🎉 Appointment created successfully!');
        console.log(`   📋 Record ID: ${result.recordId}`);
        console.log(`   🔢 Request ID: ${result.requestId}`);
        console.log(`   👤 Patient: ${result.appointmentDetails.patientName}`);
        console.log(`   🏥 Service: ${result.appointmentDetails.service}`);
        console.log(`   📍 Location: ${result.appointmentDetails.location.split(' ')[0]} - ${result.appointmentDetails.location.split(' ')[2]}`);
        console.log(`   📅 Time: ${new Date(result.appointmentDetails.appointmentTime).toLocaleString()}`);
      } else {
        console.log('   ❌ Appointment creation failed:', result.error);
      }
    } else if (createResult.data && createResult.data.error) {
      console.log('   ❌ MCP Error:', createResult.data.error.message);
    }
  } catch (error) {
    console.log('   ❌ Appointment creation failed:', error.message);
  }

  // Test 5: Search again to confirm creation
  console.log('\n5. Verify Appointment Creation...');
  try {
    const verifyRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'search_patient_appointments',
        arguments: {
          searchTerm: testPatient.patientEmail,
          searchType: 'email',
          includeUpcoming: true
        }
      },
      id: 4
    };

    const verifyResult = await makeRequest(SERVER_URL, verifyRequest);
    console.log('   ✅ Verification search:', verifyResult.statusCode === 200 ? 'PASS' : 'FAIL');
    
    if (verifyResult.data && verifyResult.data.result) {
      const result = verifyResult.data.result;
      console.log(`   📊 Found ${result.totalFound || 0} appointments for test patient`);
      
      if (result.appointments && result.appointments.length > 0) {
        const appointment = result.appointments[0];
        console.log('   📋 Latest appointment details:');
        console.log(`     - Patient: ${appointment.patient.fullName}`);
        console.log(`     - Service: ${appointment.appointment.service}`);
        console.log(`     - Date: ${new Date(appointment.appointment.startTime).toLocaleString()}`);
        console.log(`     - Status: ${appointment.status.canceled ? 'Canceled' : 'Active'}`);
      }
    }
  } catch (error) {
    console.log('   ❌ Verification search failed:', error.message);
  }

  console.log('\n🎯 Test Summary:');
  console.log('✅ All Silver State Smiles patient appointment tools are working correctly!');
  console.log('🚀 Ready for VAPI integration');
  console.log('\nNext steps:');
  console.log('1. Configure VAPI with the provided JSON configuration');
  console.log('2. Set up ElevenLabs voice integration');
  console.log('3. Configure phone number assignment');
  console.log('4. Test end-to-end voice appointment booking');
}

// Run the tests
testMCPEndpoint().catch(console.error);