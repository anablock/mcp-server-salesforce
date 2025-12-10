import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createSalesforceConnection } from '../utils/connection.js';
import { logger } from '../utils/logger.js';

const PatientAppointmentInputSchema = z.object({
  patientFirstName: z.string().min(1, "Patient first name is required"),
  patientLastName: z.string().min(1, "Patient last name is required"),
  patientEmail: z.string().email("Valid email address is required"),
  patientPhone: z.string().optional(),
  bookingFor: z.string().default("Myself"),
  serviceType: z.enum([
    "Family Dentistry",
    "Orthodontics", 
    "Dental Implants",
    "Invisalign",
    "Dental Fillings",
    "Crowns & Bridges",
    "Cosmetic Dentistry",
    "General Dentistry"
  ]),
  location: z.enum([
    "Las Vegas - Sahara 7545 W Sahara Ave #200, Las Vegas, NV 89117",
    "Las Vegas - Cheyenne 10470 W Cheyenne Ave #110, Las Vegas, NV 89129",
    "Las Vegas - Durango 6080 S Durango Dr #100, Las Vegas, NV 89113",
    "North Las Vegas 3073 W Craig Rd #102, North Las Vegas, NV 89032",
    "Henderson - Stephanie 3073 W Craig Rd #102, North Las Vegas, NV 89032",
    "Henderson - Sunset 1361 W Sunset Rd #100, Henderson, NV 89014"
  ]),
  appointmentDateTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Valid date and time required"
  }),
  painLevel: z.number().min(0).max(10).optional(),
  chiefComplaint: z.string().optional(),
  paymentMethod: z.string().optional(),
  specialNotes: z.string().optional(),
  eventDurationMinutes: z.number().default(60)
});

export const patientAppointmentTool: Tool = {
  name: 'create_patient_appointment',
  description: 'Create a new patient appointment record in Salesforce for Silver State Smiles dental practice. This tool handles the complete appointment booking process including patient information, service selection, and appointment scheduling.',
  inputSchema: {
    type: 'object',
    properties: {
      patientFirstName: {
        type: 'string',
        description: 'Patient\'s first name',
        minLength: 1
      },
      patientLastName: {
        type: 'string', 
        description: 'Patient\'s last name',
        minLength: 1
      },
      patientEmail: {
        type: 'string',
        description: 'Patient\'s email address for appointment confirmations',
        format: 'email'
      },
      patientPhone: {
        type: 'string',
        description: 'Patient\'s phone number (optional)'
      },
      bookingFor: {
        type: 'string',
        description: 'Who the appointment is for',
        default: 'Myself',
        examples: ['Myself', 'My spouse', 'My child', 'Family member']
      },
      serviceType: {
        type: 'string',
        enum: [
          'Family Dentistry',
          'Orthodontics', 
          'Dental Implants',
          'Invisalign',
          'Dental Fillings',
          'Crowns & Bridges',
          'Cosmetic Dentistry',
          'General Dentistry'
        ],
        description: 'Type of dental service requested'
      },
      location: {
        type: 'string',
        enum: [
          'Las Vegas - Sahara 7545 W Sahara Ave #200, Las Vegas, NV 89117',
          'Las Vegas - Cheyenne 10470 W Cheyenne Ave #110, Las Vegas, NV 89129',
          'Las Vegas - Durango 6080 S Durango Dr #100, Las Vegas, NV 89113',
          'North Las Vegas 3073 W Craig Rd #102, North Las Vegas, NV 89032',
          'Henderson - Stephanie 3073 W Craig Rd #102, North Las Vegas, NV 89032',
          'Henderson - Sunset 1361 W Sunset Rd #100, Henderson, NV 89014'
        ],
        description: 'Silver State Smiles office location for the appointment'
      },
      appointmentDateTime: {
        type: 'string',
        description: 'Appointment date and time in ISO format (e.g., 2025-12-15T10:00:00-08:00)',
        examples: ['2025-12-15T10:00:00-08:00', '2025-12-16T14:30:00-08:00']
      },
      painLevel: {
        type: 'number',
        description: 'Patient\'s current pain level on a scale of 0-10 (optional)',
        minimum: 0,
        maximum: 10
      },
      chiefComplaint: {
        type: 'string',
        description: 'Patient\'s main reason for the visit or primary concern (optional)'
      },
      paymentMethod: {
        type: 'string',
        description: 'Preferred payment method or insurance information (optional)',
        examples: ['Insurance', 'Cash', 'Credit Card', 'Payment Plan']
      },
      specialNotes: {
        type: 'string',
        description: 'Any special notes, accommodations, or additional information (optional)'
      },
      eventDurationMinutes: {
        type: 'number',
        description: 'Expected appointment duration in minutes',
        default: 60,
        minimum: 15,
        maximum: 240
      }
    },
    required: ['patientFirstName', 'patientLastName', 'patientEmail', 'serviceType', 'location', 'appointmentDateTime']
  }
};

export async function handlePatientAppointment(args: any) {
  try {
    logger.info('Creating patient appointment', { args });
    
    // Validate input
    const validatedInput = PatientAppointmentInputSchema.parse(args);
    
    const conn: any = await createSalesforceConnection();
    
    // Parse appointment date and calculate end time
    const appointmentStart = new Date(validatedInput.appointmentDateTime);
    const appointmentEnd = new Date(appointmentStart.getTime() + (validatedInput.eventDurationMinutes * 60 * 1000));
    const now = new Date();
    
    // Generate a unique request ID
    const requestId = `SSS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const eventUuid = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const inviteeUuid = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const formSubmissionUuid = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the appointment record in Salesforce
    const appointmentRecord = {
      Name: `${validatedInput.patientFirstName} ${validatedInput.patientLastName} - ${validatedInput.serviceType}`,
      
      // Patient Information
      Calendly__InviteeFirstName__c: validatedInput.patientFirstName,
      Calendly__InviteeLastName__c: validatedInput.patientLastName,
      Calendly__InviteeName__c: `${validatedInput.patientFirstName} ${validatedInput.patientLastName}`,
      Calendly__InviteeEmail__c: validatedInput.patientEmail,
      
      // Appointment Details
      Calendly__EventSubject__c: validatedInput.serviceType,
      Calendly__EventTypeName__c: validatedInput.serviceType,
      Calendly__EventTypeSlug__c: validatedInput.serviceType.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
      Calendly__EventTypeKind__c: 'OneOnOne',
      Calendly__EventTypeDuration__c: validatedInput.eventDurationMinutes,
      Calendly__EventStartTime__c: appointmentStart.toISOString(),
      Calendly__EventEndTime__c: appointmentEnd.toISOString(),
      Calendly__EventCreatedAt__c: now.toISOString(),
      
      // Location
      Calendly__Location__c: validatedInput.location,
      
      // Invitee Details
      Calendly__InviteeCreatedAt__c: now.toISOString(),
      Calendly__InviteeTimezone__c: 'America/Los_Angeles',
      
      // Unique Identifiers
      Calendly__RequestId__c: requestId,
      Calendly__EventUuid__c: eventUuid,
      Calendly__InviteeUuid__c: inviteeUuid,
      Calendly__FormSubmissionUUID__c: formSubmissionUuid,
      
      // Custom Questions and Responses
      Calendly__CustomQuestion1__c: 'Who are you booking for?',
      Calendly__CustomResponse1__c: validatedInput.bookingFor,
      
      // Optional Health Information
      ...(validatedInput.painLevel !== undefined && {
        Calendly__CustomQuestion2__c: 'Current Pain Level (0-10)',
        Calendly__CustomResponse2__c: validatedInput.painLevel.toString()
      }),
      
      ...(validatedInput.chiefComplaint && {
        Calendly__CustomQuestion3__c: 'Main reason for visit',
        Calendly__CustomResponse3__c: validatedInput.chiefComplaint
      }),
      
      ...(validatedInput.paymentMethod && {
        Calendly__CustomQuestion4__c: 'Preferred payment method',
        Calendly__CustomResponse4__c: validatedInput.paymentMethod
      }),
      
      // Event Description with all details
      Calendly__EventDescription__c: `Dental appointment for ${validatedInput.patientFirstName} ${validatedInput.patientLastName}.\n` +
        `Service: ${validatedInput.serviceType}\n` +
        `Location: ${validatedInput.location}\n` +
        `Booking for: ${validatedInput.bookingFor}\n` +
        (validatedInput.painLevel !== undefined ? `Pain Level: ${validatedInput.painLevel}/10\n` : '') +
        (validatedInput.chiefComplaint ? `Chief Complaint: ${validatedInput.chiefComplaint}\n` : '') +
        (validatedInput.paymentMethod ? `Payment Method: ${validatedInput.paymentMethod}\n` : '') +
        (validatedInput.specialNotes ? `Special Notes: ${validatedInput.specialNotes}\n` : ''),
      
      // Practice Information  
      Calendly__EventPrimaryPublisherName__c: 'Silver State Smiles',
      Calendly__EventPrimaryPublisherEmail__c: 'appointments@silverstatesmiles.com',
      
      // Additional required fields that may be needed
      Calendly__GroupName__c: 'Silver State Smiles',
      Calendly__ObjectId__c: `obj-${Date.now()}`,
      
      // Additional Notes
      ...(validatedInput.specialNotes && {
        Calendly__CustomQuestion5__c: 'Special Notes/Accommodations',
        Calendly__CustomResponse5__c: validatedInput.specialNotes
      }),
      
      // Flags
      Calendly__EventCanceled__c: false,
      Calendly__InviteeCanceled__c: false,
      Calendly__IsRescheduled__c: false
    };
    
    // Log the record before insertion for debugging
    logger.info('Attempting to create Salesforce record', { 
      objectType: 'Calendly__CalendlyAction__c',
      recordFields: Object.keys(appointmentRecord),
      patientName: `${validatedInput.patientFirstName} ${validatedInput.patientLastName}`
    });
    
    // Insert the record
    const result = await conn.sobject('Calendly__CalendlyAction__c').create(appointmentRecord);
    
    if (!result.success) {
      logger.error('Salesforce record creation failed', { 
        errors: result.errors,
        recordData: appointmentRecord 
      });
      throw new Error(`Failed to create appointment: ${result.errors?.join(', ')}`);
    }
    
    logger.info('Patient appointment created successfully', { 
      recordId: result.id,
      requestId,
      patientName: `${validatedInput.patientFirstName} ${validatedInput.patientLastName}`
    });
    
    return {
      success: true,
      recordId: result.id,
      requestId,
      appointmentDetails: {
        patientName: `${validatedInput.patientFirstName} ${validatedInput.patientLastName}`,
        email: validatedInput.patientEmail,
        service: validatedInput.serviceType,
        location: validatedInput.location,
        appointmentTime: appointmentStart.toISOString(),
        duration: validatedInput.eventDurationMinutes,
        painLevel: validatedInput.painLevel,
        chiefComplaint: validatedInput.chiefComplaint,
        paymentMethod: validatedInput.paymentMethod,
        specialNotes: validatedInput.specialNotes
      },
      message: 'Appointment successfully scheduled for Silver State Smiles. The patient will receive confirmation details.'
    };
    
  } catch (error: any) {
    logger.error('Error creating patient appointment', { error: error.message, args });
    
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: 'Invalid appointment data provided',
        details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    
    return {
      success: false,
      error: 'Failed to create patient appointment',
      details: error.message
    };
  }
}