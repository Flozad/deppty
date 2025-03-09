export interface PropertySchedule {
  id: string;
  property_id: string;
  status: string;
  start_timestamp: string;
  end_timestamp: string;
}

export interface PropertyVisit {
  id: string;
  property_id: number;
  status: string;
  start_date: string;
  end_date: string;
  client_id: string;
}

export interface TimeSlot {
  id: string;
  start_timestamp: string;
  end_timestamp: string;
  type: 'schedule' | 'visit';
  status: string;
  className?: string;
}

export interface CalendarEvent extends Event {
  type: 'schedule' | 'visit';
  status: string;
} 