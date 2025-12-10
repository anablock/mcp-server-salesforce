import { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const patientAppointmentTool: Tool;
export declare function handlePatientAppointment(args: any): Promise<{
    success: boolean;
    recordId: any;
    requestId: string;
    appointmentDetails: {
        patientName: string;
        email: string;
        service: "Family Dentistry" | "Orthodontics" | "Dental Implants" | "Invisalign" | "Dental Fillings" | "Crowns & Bridges" | "Cosmetic Dentistry" | "General Dentistry";
        location: "Las Vegas - Sahara 7545 W Sahara Ave #200, Las Vegas, NV 89117" | "Las Vegas - Cheyenne 10470 W Cheyenne Ave #110, Las Vegas, NV 89129" | "Las Vegas - Durango 6080 S Durango Dr #100, Las Vegas, NV 89113" | "North Las Vegas 3073 W Craig Rd #102, North Las Vegas, NV 89032" | "Henderson - Stephanie 3073 W Craig Rd #102, North Las Vegas, NV 89032" | "Henderson - Sunset 1361 W Sunset Rd #100, Henderson, NV 89014";
        appointmentTime: string;
        duration: number;
        painLevel: number;
        chiefComplaint: string;
        paymentMethod: string;
        specialNotes: string;
    };
    message: string;
    error?: undefined;
    details?: undefined;
} | {
    success: boolean;
    error: string;
    details: any;
    recordId?: undefined;
    requestId?: undefined;
    appointmentDetails?: undefined;
    message?: undefined;
}>;
