import { Ticket } from "@prisma/client";

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  venue: string;
  organizerId: string;
  tickets: Ticket[];
  createdAt: Date;
}
