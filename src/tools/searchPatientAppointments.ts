import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createSalesforceConnection } from '../utils/connection.js';
import { logger } from '../utils/logger.js';

const SearchPatientInputSchema = z.object({
  searchTerm: z.string().min(2, "Search term must be at least 2 characters"),
  searchType: z.enum(['email', 'name', 'phone', 'all']).default('all'),
  includeUpcoming: z.boolean().default(true),
  includePast: z.boolean().default(false),
  includeCanceled: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(20)
});

export const searchPatientAppointmentsTool: Tool = {
  name: 'search_patient_appointments',
  description: 'Search for existing patient appointments in Silver State Smiles system by name, email, phone, or general search. Useful for checking appointment history, avoiding duplicates, and managing existing bookings.',
  inputSchema: {
    type: 'object',
    properties: {
      searchTerm: {
        type: 'string',
        description: 'Search term - can be patient name, email address, phone number, or general text',
        minLength: 2,
        examples: ['john.doe@email.com', 'John Smith', '555-1234', 'dental cleaning']
      },
      searchType: {
        type: 'string',
        enum: ['email', 'name', 'phone', 'all'],
        description: 'Type of search to perform',
        default: 'all'
      },
      includeUpcoming: {
        type: 'boolean',
        description: 'Include upcoming/future appointments',
        default: true
      },
      includePast: {
        type: 'boolean', 
        description: 'Include past appointments',
        default: false
      },
      includeCanceled: {
        type: 'boolean',
        description: 'Include canceled appointments',
        default: false
      },
      limit: {
        type: 'number',
        description: 'Maximum number of appointments to return',
        minimum: 1,
        maximum: 100,
        default: 20
      }
    },
    required: ['searchTerm']
  }
};

export async function handleSearchPatientAppointments(args: any) {
  try {
    logger.info('Searching patient appointments', { args });
    
    const validatedInput = SearchPatientInputSchema.parse(args);
    const conn: any = await createSalesforceConnection();
    
    // Build the WHERE clause based on search type and filters
    const whereConditions = [];
    
    // Search conditions
    if (validatedInput.searchType === 'email') {
      whereConditions.push(`Calendly__InviteeEmail__c LIKE '%${validatedInput.searchTerm}%'`);
    } else if (validatedInput.searchType === 'name') {
      whereConditions.push(`(Calendly__InviteeFirstName__c LIKE '%${validatedInput.searchTerm}%' OR Calendly__InviteeLastName__c LIKE '%${validatedInput.searchTerm}%' OR Calendly__InviteeName__c LIKE '%${validatedInput.searchTerm}%')`);
    } else if (validatedInput.searchType === 'phone') {
      whereConditions.push(`(Name LIKE '%${validatedInput.searchTerm}%' OR Calendly__EventDescription__c LIKE '%${validatedInput.searchTerm}%')`);
    } else {
      // 'all' - search across all relevant fields
      whereConditions.push(`(
        Calendly__InviteeEmail__c LIKE '%${validatedInput.searchTerm}%' OR 
        Calendly__InviteeFirstName__c LIKE '%${validatedInput.searchTerm}%' OR 
        Calendly__InviteeLastName__c LIKE '%${validatedInput.searchTerm}%' OR 
        Calendly__InviteeName__c LIKE '%${validatedInput.searchTerm}%' OR
        Calendly__EventSubject__c LIKE '%${validatedInput.searchTerm}%' OR
        Calendly__EventDescription__c LIKE '%${validatedInput.searchTerm}%' OR
        Name LIKE '%${validatedInput.searchTerm}%'
      )`);
    }
    
    // Time-based filters
    const now = new Date().toISOString();
    if (validatedInput.includeUpcoming && !validatedInput.includePast) {
      whereConditions.push(`Calendly__EventStartTime__c >= ${now}`);
    } else if (validatedInput.includePast && !validatedInput.includeUpcoming) {
      whereConditions.push(`Calendly__EventStartTime__c < ${now}`);
    }
    // If both or neither are true, don't add time filter
    
    // Canceled appointments filter
    if (!validatedInput.includeCanceled) {
      whereConditions.push(`(Calendly__EventCanceled__c = false AND Calendly__InviteeCanceled__c = false)`);
    }
    
    const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '';
    
    // Build the SOQL query
    const fields = [
      'Id',
      'Name', 
      'Calendly__InviteeFirstName__c',
      'Calendly__InviteeLastName__c',
      'Calendly__InviteeName__c',
      'Calendly__InviteeEmail__c',
      'Calendly__EventSubject__c',
      'Calendly__EventTypeName__c',
      'Calendly__EventStartTime__c',
      'Calendly__EventEndTime__c',
      'Calendly__Location__c',
      'Calendly__EventCreatedAt__c',
      'Calendly__InviteeCreatedAt__c',
      'Calendly__EventCanceled__c',
      'Calendly__InviteeCanceled__c',
      'Calendly__IsRescheduled__c',
      'Calendly__EventCancelReason__c',
      'Calendly__InviteeCancelReason__c',
      'Calendly__CustomQuestion1__c',
      'Calendly__CustomResponse1__c',
      'Calendly__CustomQuestion2__c', 
      'Calendly__CustomResponse2__c',
      'Calendly__CustomQuestion3__c',
      'Calendly__CustomResponse3__c',
      'Calendly__CustomQuestion4__c',
      'Calendly__CustomResponse4__c',
      'Calendly__CustomQuestion5__c',
      'Calendly__CustomResponse5__c',
      'Calendly__RequestId__c',
      'CreatedDate',
      'LastModifiedDate'
    ];
    
    let query = `SELECT ${fields.join(', ')} FROM Calendly__CalendlyAction__c`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    query += ` ORDER BY Calendly__EventStartTime__c DESC LIMIT ${validatedInput.limit}`;
    
    logger.info('Executing patient appointment search query', { query });
    
    const result = await conn.query(query);
    
    // Process and format the results
    const appointments = result.records.map((record: any) => {
      const appointment = {
        id: record.Id,
        recordName: record.Name,
        patient: {
          firstName: record.Calendly__InviteeFirstName__c,
          lastName: record.Calendly__InviteeLastName__c,
          fullName: record.Calendly__InviteeName__c,
          email: record.Calendly__InviteeEmail__c
        },
        appointment: {
          service: record.Calendly__EventSubject__c,
          serviceType: record.Calendly__EventTypeName__c,
          startTime: record.Calendly__EventStartTime__c,
          endTime: record.Calendly__EventEndTime__c,
          location: record.Calendly__Location__c,
          requestId: record.Calendly__RequestId__c
        },
        status: {
          canceled: record.Calendly__EventCanceled__c || record.Calendly__InviteeCanceled__c,
          rescheduled: record.Calendly__IsRescheduled__c,
          cancelReason: record.Calendly__EventCancelReason__c || record.Calendly__InviteeCancelReason__c
        },
        dates: {
          appointmentCreated: record.Calendly__EventCreatedAt__c,
          inviteeCreated: record.Calendly__InviteeCreatedAt__c,
          recordCreated: record.CreatedDate,
          lastModified: record.LastModifiedDate
        },
        customData: {}
      };
      
      // Add custom question/response pairs
      for (let i = 1; i <= 5; i++) {
        const question = record[`Calendly__CustomQuestion${i}__c`];
        const response = record[`Calendly__CustomResponse${i}__c`];
        if (question && response) {
          appointment.customData[question] = response;
        }
      }
      
      return appointment;
    });
    
    logger.info('Patient appointment search completed', { 
      searchTerm: validatedInput.searchTerm,
      resultCount: appointments.length,
      totalRecords: result.totalSize
    });
    
    return {
      success: true,
      searchTerm: validatedInput.searchTerm,
      searchType: validatedInput.searchType,
      filters: {
        includeUpcoming: validatedInput.includeUpcoming,
        includePast: validatedInput.includePast,
        includeCanceled: validatedInput.includeCanceled
      },
      totalFound: result.totalSize,
      returned: appointments.length,
      appointments,
      message: `Found ${result.totalSize} appointment(s) matching "${validatedInput.searchTerm}"`
    };
    
  } catch (error: any) {
    logger.error('Error searching patient appointments', { error: error.message, args });
    
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: 'Invalid search parameters',
        details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    
    return {
      success: false,
      error: 'Failed to search patient appointments',
      details: error.message
    };
  }
}