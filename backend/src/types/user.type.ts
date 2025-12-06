import { Event, Ticket } from "@prisma/client";

export type Role = "ADMIN" | "ORGANIZER" | "ATTENDEE";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  tickets: Ticket[];
  events: Event[];
  createdAt: Date;
  totalAttended: number;
}
