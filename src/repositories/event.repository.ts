// src/repositories/EventRepository.ts
import { BaseRepository } from "./base.repository.js";
import { Event, EventType } from "../entities/event.entity.js";
import { AppDataSource } from "../database/data-source.js";
export class EventRepository extends BaseRepository<Event> {
  constructor() {
    super(Event);
  }
 //   private repo = AppDataSource.getRepository(Event);
  async logEvent(name: string, message: string, type: EventType = EventType.INFO, metadata?: Record<string, any>): Promise<Event> {
    const event = this.repository.create({ name, message, type, metadata });
    return this.save(event);
  }

  async getRecentEvents(limit: number = 20): Promise<Event[]> {
    return this.repository.find({
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
