import { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const searchPatientAppointmentsTool: Tool;
export declare function handleSearchPatientAppointments(args: any): Promise<{
    success: boolean;
    searchTerm: string;
    searchType: "all" | "name" | "email" | "phone";
    filters: {
        includeUpcoming: boolean;
        includePast: boolean;
        includeCanceled: boolean;
    };
    totalFound: any;
    returned: any;
    appointments: any;
    message: string;
    error?: undefined;
    details?: undefined;
} | {
    success: boolean;
    error: string;
    details: any;
    searchTerm?: undefined;
    searchType?: undefined;
    filters?: undefined;
    totalFound?: undefined;
    returned?: undefined;
    appointments?: undefined;
    message?: undefined;
}>;
