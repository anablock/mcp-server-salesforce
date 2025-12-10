#!/usr/bin/env node

/**
 * Test the appointment creation fix for required fields
 */

const https = require('https');

const SERVER_URL = 'web-production-1bd9.up.railway.app';
const BEARER_TOKEN = 'salesforce-mcp-token-2024';

async function testAppointmentCreation() {
  console.log('🧪 Testing Appointment Creation Fix...\n');

  const testAppointment = {
    patientFirstName: "Test",
    patientLastName: "Patient", 
    patientEmail: "test.fix@silverstatesmiles.com",
    patientPhone: "555-0123",
    serviceType: "General Dentistry",
    location: "Las Vegas - Sahara 7545 W Sahara Ave #200, Las Vegas, NV 89117",
    appointmentDateTime: "2025-12-20T14:00:00-08:00",
    painLevel: 0,
    chiefComplaint: "Routine checkup and cleaning",
    paymentMethod: "Insurance",
    specialNotes: "Test appointment with required fields fix"
  };

  console.log('📋 Test appointment data:');
  console.log(`   Patient: ${testAppointment.patientFirstName} ${testAppointment.patientLastName}`);
  console.log(`   Email: ${testAppointment.patientEmail}`);
  console.log(`   Service: ${testAppointment.serviceType}`);
  console.log(`   Date: ${testAppointment.appointmentDateTime}`);

  try {
    const createRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "create_patient_appointment",
        arguments: testAppointment
      },
      id: 1
    };

    console.log('\n🔄 Sending appointment creation request...');
    const result = await makeRequest(createRequest);
    
    if (result.statusCode === 200 && result.data && result.data.result) {
      const appointmentResult = result.data.result;
      
      if (appointmentResult.success) {
        console.log('✅ SUCCESS! Appointment created successfully!');
        console.log(`📋 Record ID: ${appointmentResult.recordId}`);
        console.log(`🔢 Request ID: ${appointmentResult.requestId}`);
        console.log(`👤 Patient: ${appointmentResult.appointmentDetails.patientName}`);
        console.log(`🏥 Service: ${appointmentResult.appointmentDetails.service}`);
        console.log(`📍 Location: ${appointmentResult.appointmentDetails.location.split(' - ')[0]}`);
        console.log(`📅 Date: ${new Date(appointmentResult.appointmentDetails.appointmentTime).toLocaleString()}`);
        
        if (appointmentResult.appointmentDetails.painLevel !== undefined) {
          console.log(`🩺 Pain Level: ${appointmentResult.appointmentDetails.painLevel}/10`);
        }
        
        if (appointmentResult.appointmentDetails.chiefComplaint) {
          console.log(`💬 Chief Complaint: ${appointmentResult.appointmentDetails.chiefComplaint}`);
        }
        
        console.log('\n🎉 The required fields issue has been fixed!');
        console.log('Silver State Smiles voice AI is ready for production use.');
        
      } else {
        console.log('❌ Appointment creation failed:', appointmentResult.error);
        if (appointmentResult.details) {
          console.log('Details:', appointmentResult.details);
        }
      }
    } else if (result.data && result.data.error) {
      console.log('❌ MCP Error:', result.data.error.message);
      console.log('Error Code:', result.data.error.code);
    } else {
      console.log('❌ Unexpected response:', result);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
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
            data: responseData,
            parseError: e.message
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

// Run the test
testAppointmentCreation().catch(console.error);