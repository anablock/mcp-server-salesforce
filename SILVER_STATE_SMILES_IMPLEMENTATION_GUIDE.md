# Silver State Smiles Voice AI Implementation Guide

## Overview

This implementation provides a complete voice AI assistant system for Silver State Smiles dental practice, enabling patients to schedule appointments via phone calls. The system integrates with Salesforce to store appointment data and patient information.

## System Components

### 1. Voice AI Assistant Prompt (`SILVER_STATE_SMILES_VOICE_AI_PROMPT.md`)
- Comprehensive system prompt for natural conversation flow
- Handles appointment scheduling, patient information collection
- Includes empathy for dental anxiety and pain management
- Covers all Silver State Smiles locations and services

### 2. Salesforce Integration Tools

#### Patient Appointment Tool (`src/tools/patientAppointment.ts`)
- **Function**: `create_patient_appointment`
- **Purpose**: Create new patient appointment records in Salesforce
- **Features**:
  - Validates all patient information
  - Maps to Calendly schema fields in Salesforce
  - Handles service types, locations, and special needs
  - Generates unique identifiers for tracking
  - Supports pain level assessment and payment preferences

#### Patient Search Tool (`src/tools/searchPatientAppointments.ts`)
- **Function**: `search_patient_appointments` 
- **Purpose**: Search existing appointments to avoid duplicates
- **Features**:
  - Search by name, email, phone, or general text
  - Filter by upcoming/past/canceled appointments
  - Supports patient history lookup
  - Comprehensive appointment details in results

### 3. VAPI Configuration (`SILVER_STATE_SMILES_VAPI_CONFIG.json`)
- Complete VAPI phone system configuration
- ElevenLabs voice integration for natural speech
- Deepgram transcription with dental keywords
- HIPAA compliance settings
- Voicemail configuration for after-hours
- Function call configurations for both tools

## Available Services

The system handles appointments for these Silver State Smiles services:
- Family Dentistry
- Orthodontics  
- Dental Implants
- Invisalign
- Dental Fillings
- Crowns & Bridges
- Cosmetic Dentistry
- General Dentistry

## Office Locations

All six Silver State Smiles locations are supported:
- **Las Vegas - Sahara**: 7545 W Sahara Ave #200, Las Vegas, NV 89117
- **Las Vegas - Cheyenne**: 10470 W Cheyenne Ave #110, Las Vegas, NV 89129
- **Las Vegas - Durango**: 6080 S Durango Dr #100, Las Vegas, NV 89113
- **North Las Vegas**: 3073 W Craig Rd #102, North Las Vegas, NV 89032
- **Henderson - Stephanie**: 3073 W Craig Rd #102, North Las Vegas, NV 89032
- **Henderson - Sunset**: 1361 W Sunset Rd #100, Henderson, NV 89014

## Conversation Flow

### 1. Initial Contact
- Warm greeting and introduction
- Identify the caller's needs (appointment type)
- Emergency triage for urgent dental pain

### 2. Information Collection
**Required Data:**
- Patient first and last name
- Email address
- Phone number
- Relationship (self, spouse, child, etc.)
- Preferred service type
- Preferred location
- Desired appointment date/time

**Optional Health Information:**
- Current pain level (0-10 scale)
- Chief complaint/main concern
- Payment method/insurance preference
- Special accommodations needed

### 3. Appointment Scheduling
- Search for existing appointments (avoid duplicates)
- Create new appointment record
- Confirm all details with patient
- Provide confirmation information

### 4. Follow-up Instructions
- Arrival instructions (15 minutes early)
- What to bring (ID, insurance card)
- Contact information for changes
- Comfort reassurance

## Salesforce Data Structure

Appointments are stored in the `Calendly__CalendlyAction__c` object with these key fields:

### Patient Information
- `Calendly__InviteeFirstName__c`: Patient first name
- `Calendly__InviteeLastName__c`: Patient last name  
- `Calendly__InviteeEmail__c`: Email address
- `Calendly__InviteeName__c`: Full name

### Appointment Details  
- `Calendly__EventSubject__c`: Service type
- `Calendly__EventStartTime__c`: Appointment start time
- `Calendly__EventEndTime__c`: Appointment end time
- `Calendly__Location__c`: Office location
- `Calendly__EventDescription__c`: Comprehensive appointment notes

### Custom Questions/Responses
- Pain level assessment
- Chief complaint
- Payment method preference
- Special accommodations
- Who the appointment is for

### Tracking Fields
- `Calendly__RequestId__c`: Unique request identifier
- `Calendly__EventUuid__c`: Event UUID
- `Calendly__InviteeUuid__c`: Invitee UUID
- `Calendly__FormSubmissionUUID__c`: Form submission UUID

## Implementation Steps

### 1. Deploy MCP Server
The Salesforce MCP server is already deployed at:
- **URL**: `https://web-production-1bd9.up.railway.app/mcp`
- **Authentication**: Bearer token `salesforce-mcp-token-2024`
- **Protocol**: JSON-RPC 2.0 over HTTP POST

### 2. Configure VAPI
1. Import the configuration from `SILVER_STATE_SMILES_VAPI_CONFIG.json`
2. Obtain ElevenLabs API key for voice synthesis
3. Configure Deepgram for transcription
4. Set up phone number assignment

### 3. Test Integration
Test both functions independently:

#### Test Patient Appointment Creation
```bash
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_patient_appointment",
      "arguments": {
        "patientFirstName": "John",
        "patientLastName": "Doe",
        "patientEmail": "john.doe@email.com",
        "patientPhone": "555-1234",
        "serviceType": "General Dentistry",
        "location": "Las Vegas - Sahara 7545 W Sahara Ave #200, Las Vegas, NV 89117",
        "appointmentDateTime": "2025-12-15T10:00:00-08:00",
        "painLevel": 3,
        "chiefComplaint": "Tooth pain",
        "paymentMethod": "Insurance"
      }
    },
    "id": 1
  }'
```

#### Test Patient Search
```bash
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_patient_appointments",
      "arguments": {
        "searchTerm": "john.doe@email.com",
        "searchType": "email",
        "includeUpcoming": true
      }
    },
    "id": 2
  }'
```

### 4. Voice AI Training
The system prompt includes comprehensive guidelines for:
- Natural conversation flow
- Empathetic responses for dental anxiety
- Emergency prioritization for pain situations
- Professional healthcare communication
- Clear appointment confirmations

### 5. Monitoring & Analytics
Monitor these key metrics:
- Call completion rates
- Successful appointment bookings
- Patient satisfaction scores
- Common failure points
- System response times

## Special Features

### Pain Management Protocol
- Immediate assessment of pain level (1-10 scale)
- Priority scheduling for high pain levels
- Empathetic responses and comfort measures
- After-hours emergency contact information

### HIPAA Compliance
- Voice recording disabled by default
- Secure data transmission to Salesforce
- Patient information protection
- Audit trail maintenance

### Accessibility Features  
- Multiple language support capability
- Hearing impaired accommodations
- Clear, slow speech options
- Repeat information on request

## Troubleshooting

### Common Issues
1. **Authentication Errors**: Verify Bearer token configuration
2. **Salesforce Connection**: Check environment variables
3. **Voice Quality**: Adjust ElevenLabs settings
4. **Transcription Accuracy**: Update keyword list

### Support Contacts
- **Technical Issues**: MCP server logs at Railway dashboard
- **Salesforce Issues**: Check connection and permissions
- **VAPI Issues**: Review configuration and API limits

## Success Metrics

Track these KPIs for implementation success:
- **Appointment Booking Rate**: Target 85%+ completion
- **Patient Satisfaction**: Target 4.5+ stars
- **System Uptime**: Target 99.5%
- **Response Time**: Target <3 seconds
- **Accuracy**: Target 95%+ correct information capture

## Future Enhancements

Potential improvements for future releases:
- SMS appointment reminders
- Integration with practice management system
- Automated insurance verification
- Follow-up care scheduling
- Patient feedback collection
- Multi-language support
- Advanced analytics dashboard

## Security Considerations

- All patient data encrypted in transit and at rest
- Bearer token authentication for API access
- HIPAA compliant data handling
- Regular security audits recommended
- Access logging and monitoring

This implementation provides Silver State Smiles with a professional, efficient, and patient-friendly appointment scheduling system that enhances patient experience while reducing administrative overhead.