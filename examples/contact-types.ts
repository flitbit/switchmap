/**
 * @hidden
 * @packageDocumentation
 */

// Companion/support file for ./router.ts

export type ContactType = 'email' | 'text' | 'phone' | 'tweet' | 'holla';

export interface RequestForInfo {
  type: ContactType;
  name: string;
  surname: string;
  emailAddress?: string;
  phoneNumber?: string;
  twitterHandle?: string;
  proximityMiles?: number;
}

export type RequestHandler = (req: RequestForInfo) => void | Promise<void>;

export const sendEmail: RequestHandler = ({ name, surname, emailAddress }) =>
  console.log(`sending info to ${name} ${surname} via email: ${emailAddress}`);

export const sendText: RequestHandler = ({ name, surname, phoneNumber }) =>
  console.log(`sending info to ${name} ${surname} via text: ${phoneNumber}`);

export const callRequesterByPhone: RequestHandler = ({ name, surname, phoneNumber }) =>
  console.log(`conveying info to ${name} ${surname} via phone: ${phoneNumber}`);

export const queueForSupportPersonnel: RequestHandler = (req) =>
  console.log(`contact by ${req.type} for ${req.name} ${req.surname} queued for support personnel`);

export const unsupported: RequestHandler = (req) =>
  console.log(`contact by ${req.type} unsupported, ${req.name} ${req.surname} won't hear from us, round file it.`);
