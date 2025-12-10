# Silver State Smiles Deployment Checklist

## ✅ **Pre-Deployment Verification**

### 1. **Code Updates Complete**
- [x] Added patient appointment tools to `src/index.ts` (MCP server)
- [x] Added patient appointment tools to `src/http-server.ts` (HTTP wrapper)  
- [x] Added patient appointment tools to `src/production-server.ts` (Production server)
- [x] TypeScript compilation successful (`npm run build`)
- [x] All imports and exports properly configured

### 2. **Test MCP Server**

Run the quick test script:
```bash
node quick-test-patient-tools.js
```

**Expected Results:**
- ✅ Tools list shows 15+ tools total (including 2 patient tools)
- ✅ Patient search returns valid response (even if empty)
- ✅ Appointment creation succeeds and returns Record ID

### 3. **Manual API Testing**

Test the MCP endpoint directly:

#### List Tools:
```bash
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

#### Test Search:
```bash
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_patient_appointments","arguments":{"searchTerm":"test","searchType":"all"}},"id":2}'
```

#### Test Creation:
```bash
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_patient_appointment","arguments":{"patientFirstName":"Test","patientLastName":"User","patientEmail":"test@test.com","serviceType":"General Dentistry","location":"Las Vegas - Sahara 7545 W Sahara Ave #200, Las Vegas, NV 89117","appointmentDateTime":"2025-12-15T10:00:00-08:00"}},"id":3}'
```

## 🚀 **VAPI Integration**

### 4. **VAPI Configuration**

1. **Import Configuration File:**
   - Upload `SILVER_STATE_SMILES_VAPI_CONFIG.json` to VAPI dashboard

2. **Voice Provider Setup:**
   - Configure ElevenLabs API key
   - Voice ID: `pNInz6obpgDQGcFmaJgB` (or choose appropriate voice)

3. **Transcription Setup:**
   - Configure Deepgram API key
   - Model: `nova-2`
   - Language: `en-US`

4. **Phone Number Assignment:**
   - Assign dedicated phone number for Silver State Smiles
   - Test inbound call routing

### 5. **Voice AI Testing**

**Test Scenarios:**

1. **Basic Appointment Booking:**
   - Call the number
   - Request "General Dentistry" appointment
   - Provide patient information
   - Select Las Vegas location
   - Confirm appointment details

2. **Pain Assessment:**
   - Call with dental emergency
   - Report pain level 7-8
   - Verify priority handling and empathy

3. **Service Information:**
   - Ask about available services
   - Request information about Invisalign
   - Verify accurate service descriptions

4. **Location Selection:**
   - Ask about office locations
   - Request specific Henderson location
   - Verify correct address provided

### 6. **Salesforce Data Verification**

After successful voice calls:

1. **Check Salesforce Records:**
   ```bash
   # Search for created appointments
   curl -X POST https://web-production-1bd9.up.railway.app/mcp \
     -H "Authorization: Bearer salesforce-mcp-token-2024" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_patient_appointments","arguments":{"searchTerm":"[patient-email]","searchType":"email"}},"id":1}'
   ```

2. **Verify Data Quality:**
   - Patient information complete and accurate
   - Appointment time properly formatted
   - Location correctly stored
   - Custom questions/responses captured
   - Pain level and chief complaint recorded

## 📊 **Monitoring & Analytics**

### 7. **Success Metrics**

Track these KPIs after deployment:

- **Call Completion Rate**: Target 85%+
- **Appointment Booking Success**: Target 80%+
- **Patient Satisfaction**: Target 4.5+ stars
- **System Response Time**: Target <3 seconds
- **Data Accuracy**: Target 95%+

### 8. **Error Monitoring**

Monitor for these common issues:

- **Authentication Failures**: Check bearer token
- **Salesforce Connection Errors**: Verify credentials
- **Voice Recognition Issues**: Adjust transcription settings
- **Appointment Conflicts**: Implement time validation
- **Data Validation Errors**: Check required fields

## 🔧 **Troubleshooting Guide**

### Common Issues:

#### "Unknown tool" Error:
- Verify production server has been redeployed with new tools
- Check tool names match exactly in VAPI config

#### "JSON Parse Failed" Error:
- Verify VAPI request format matches expected JSON-RPC structure
- Check for proper escaping in function call parameters

#### "Salesforce Connection Failed":
- Verify environment variables are set correctly
- Check Salesforce org permissions
- Confirm network connectivity

#### "Authentication Failed":
- Verify bearer token is correctly configured
- Check for extra spaces or characters in token

### Debug Commands:

```bash
# Test server health
curl https://web-production-1bd9.up.railway.app/health

# List all tools
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Test Salesforce connection
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"salesforce_query_records","arguments":{"objectName":"Account","fields":["Name"],"limit":1}},"id":1}'
```

## ✅ **Final Deployment Checklist**

- [ ] All MCP server files updated with patient tools
- [ ] TypeScript build successful
- [ ] Quick test script passes all tests
- [ ] Manual API tests successful
- [ ] VAPI configuration imported
- [ ] Voice provider configured
- [ ] Phone number assigned
- [ ] Voice AI test calls successful
- [ ] Salesforce data verification complete
- [ ] Monitoring and alerts configured
- [ ] Staff training completed
- [ ] Patient communication prepared

## 🎉 **Go Live!**

Once all checklist items are complete, Silver State Smiles voice AI appointment booking is ready for production use!

### Next Steps:
1. **Announce the service** to existing patients
2. **Monitor performance** closely for the first week
3. **Collect feedback** and iterate on improvements
4. **Scale capacity** based on call volume

The system is designed to handle high call volumes while maintaining professional, empathetic patient interactions and accurate data capture in Salesforce.