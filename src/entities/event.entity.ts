// src/entities/event.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export enum EventType {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "enum", enum: EventType, default: EventType.INFO })
  type!: EventType;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: "createdAt" })
  createdAt!: Date;
}
