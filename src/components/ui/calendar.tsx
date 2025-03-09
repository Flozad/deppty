"use client"

import * as React from "react"
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

export const PROPERTY_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-indigo-500',
] as const;

export interface TimeSlot {
  id: string
  start_timestamp: string
  end_timestamp: string
  status: string
  property_id?: string
}

interface VisitTimeSlot extends TimeSlot {
  type: 'visit';
  client_name?: string;
  client_id?: string;
}

interface Property {
  id: string;
  title: string;
  color: string;
  details?: string // Add details field for additional property info
}

// Add new interface for property views
export interface PropertyView {
  id: string
  property_id: string
  client_id: string
  view_count: number
  last_viewed_at: string
  created_at: string
  start_time: string  // We'll need to add this to the table
  end_time: string    // We'll need to add this to the table
}

interface WeeklyCalendarProps {
  className?: string
  selectedDate?: Date
  events?: TimeSlot[]
  bookedViews?: PropertyView[]  // Add booked views
  onSlotSelect?: (date: Date) => void
  onTimeSelect?: (date: string, startTime: string, endTime: string) => void
  onEventUpdate?: (event: TimeSlot, newStart: string, newEnd: string) => void
  onEventDelete?: (event: TimeSlot) => void
  properties: Property[]
  selectedPropertyId?: string | null
  getEventDisplay?: (event: TimeSlot) => string
}

// Change back to full day hours but keep track of default view start
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DEFAULT_START_HOUR = 9 // Used to set initial scroll position
const TIME_SLOT_HEIGHT = 60 // pixels per hour

export function WeeklyCalendar({
  className,
  selectedDate = new Date(),
  events = [],
  bookedViews = [],
  onTimeSelect,
  properties = [],
  selectedPropertyId,
  onEventUpdate,
  onEventDelete,
  getEventDisplay = (event) => {
    if ('type' in event && event.type === 'visit') {
      return `👥 Visita - ${(event as VisitTimeSlot).client_name || 'Sin nombre de cliente'}`;
    }
    return '📅 Disponible';
  },
}: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = React.useState(startOfWeek(selectedDate))
  const [isSelecting, setIsSelecting] = React.useState(false)
  const [selectionStart, setSelectionStart] = React.useState<{ date: Date, hour: number } | null>(null)
  const [selectedEvent, setSelectedEvent] = React.useState<TimeSlot | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editStartTime, setEditStartTime] = React.useState("")
  const [editEndTime, setEditEndTime] = React.useState("")
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i))
  const timeGridRef = React.useRef<HTMLDivElement>(null);
  
  // Add useEffect to set initial scroll position
  React.useEffect(() => {
    if (timeGridRef.current) {
      const scrollPosition = DEFAULT_START_HOUR * TIME_SLOT_HEIGHT;
      timeGridRef.current.scrollTop = scrollPosition;
    }
  }, []);

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1))
  }

  const handleMouseDown = (date: Date, hour: number) => {
    setIsSelecting(true)
    setSelectionStart({ date, hour })
  }

  const handleMouseUp = (date: Date, hour: number) => {
    if (selectionStart && onTimeSelect) {
      const selectedDate = format(date, 'yyyy-MM-dd')
      if (format(selectionStart.date, 'yyyy-MM-dd') === selectedDate) {
        const startHour = Math.min(selectionStart.hour, hour)
        const endHour = Math.max(selectionStart.hour, hour)
        
        onTimeSelect(
          selectedDate,
          `${String(startHour).padStart(2, '0')}:00`,
          `${String(endHour + 1).padStart(2, '0')}:00`
        )
      }
    }
    setIsSelecting(false)
    setSelectionStart(null)
  }

  const handleEventClick = (event: TimeSlot) => {
    setSelectedEvent(event)
    setEditStartTime(new Date(event.start_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    setEditEndTime(new Date(event.end_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    setIsEditDialogOpen(true)
  }

  const handleUpdateEvent = () => {
    if (selectedEvent && onEventUpdate) {
      const eventDate = format(new Date(selectedEvent.start_timestamp), 'yyyy-MM-dd')
      onEventUpdate(
        selectedEvent,
        `${eventDate} ${editStartTime}`,
        `${eventDate} ${editEndTime}`
      )
    }
    setIsEditDialogOpen(false)
  }

  // Update the getPropertyDetails function to use the color mapping
  const getPropertyDetails = (propertyId: string): Property => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      const colorIndex = properties.findIndex(p => p.id === propertyId);
      return {
        ...property,
        color: PROPERTY_COLORS[colorIndex % PROPERTY_COLORS.length]
      };
    }
    return {
      id: 'default',
      title: 'Available',
      color: PROPERTY_COLORS[0],
      details: ''
    };
  };

  // Function to render a booked view slot
  const renderBookedView = (view: PropertyView, dayStr: string) => {
    const viewStart = new Date(view.start_time)
    const viewEnd = new Date(view.end_time)
    const viewDayStr = format(viewStart, 'yyyy-MM-dd')
    
    if (dayStr === viewDayStr) {
      return (
        <div
          key={view.id}
          className="absolute left-0 right-0 bg-red-500/20 border border-red-500 rounded m-1"
          style={{
            top: `${viewStart.getHours() * TIME_SLOT_HEIGHT}px`,
            height: `${(viewEnd.getHours() - viewStart.getHours()) * TIME_SLOT_HEIGHT}px`,
            zIndex: 5,
          }}
        >
          <div className="text-xs text-red-500 font-medium px-2">
            Booked: {format(viewStart, 'HH:mm')} - {format(viewEnd, 'HH:mm')}
          </div>
        </div>
      )
    }
    return null
  }

  const renderEvent = (event: TimeSlot, currentDayStr: string) => {
    const eventStart = new Date(event.start_timestamp)
    const eventEnd = new Date(event.end_timestamp)
    const eventDayStr = format(eventStart, 'yyyy-MM-dd')
    
    if (currentDayStr === eventDayStr) {
      const property = getPropertyDetails(event.property_id || '')
      const isSelected = event.property_id === selectedPropertyId
      
      return (
        <div
          key={event.id}
          className={cn(
            "absolute left-0 right-0 rounded m-1 px-2 py-1 overflow-hidden transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-white/20",
            property.color,
            isSelected ? "opacity-100" : "opacity-90",
            "z-0" // Put available slots behind booked views
          )}
          style={{
            top: `${eventStart.getHours() * TIME_SLOT_HEIGHT}px`,
            height: `${(eventEnd.getHours() - eventStart.getHours()) * TIME_SLOT_HEIGHT}px`,
          }}
          onClick={() => handleEventClick(event)}
        >
          <div className="flex flex-col h-full text-white">
            <div className="text-sm font-semibold truncate">
              {property.title}
            </div>
            <div className="text-xs opacity-90">
              {format(eventStart, 'HH:mm')} - {format(eventEnd, 'HH:mm')}
            </div>
            {property.details && (
              <div className="text-xs truncate opacity-75">
                {property.details}
              </div>
            )}
            <div className="text-xs opacity-90">
              {getEventDisplay ? getEventDisplay(event) : event.status}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <div className={cn("flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white", className)}>
        {/* Navigation Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousWeek}
              className="hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
              className="hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Help tooltip */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 dark:text-slate-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </Button>
            <div className="absolute right-0 w-72 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 invisible group-hover:visible z-50 text-sm">
              <h4 className="font-semibold mb-2">How to use the calendar:</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li>• Click and drag to select available time slots</li>
                <li>• Click on existing events to edit or delete them</li>
                <li>• Use the view buttons to filter between all events, available slots, or visits</li>
                <li>• Calendar shows hours from 9am to 11pm</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Week Header */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <div className="w-20" />
          {weekDays.map((day) => (
            <div
              key={day.toString()}
              className={cn(
                "flex-1 p-2 text-center border-l border-slate-200 dark:border-slate-700",
                format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && "bg-slate-100 dark:bg-slate-800"
              )}
            >
              <div className="font-semibold">{format(day, 'EEE')}</div>
              <div className="text-sm">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="flex flex-1 overflow-y-auto" ref={timeGridRef}>
          {/* Time Labels */}
          <div className="w-20 flex-shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[60px] border-b border-slate-200 dark:border-slate-700 text-sm px-2 py-1"
              >
                {format(new Date().setHours(hour), 'ha')}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map((day) => (
            <div
              key={day.toString()}
              className={cn(
                "flex-1 border-l border-slate-200 dark:border-slate-700 relative",
                format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && "bg-slate-50 dark:bg-slate-800/50"
              )}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className={cn(
                    "h-[60px] border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
                    isSelecting && selectionStart && 
                    format(day, 'yyyy-MM-dd') === format(selectionStart.date, 'yyyy-MM-dd') &&
                    hour >= Math.min(selectionStart.hour, hour) &&
                    hour <= Math.max(selectionStart.hour, hour) &&
                    selectedPropertyId && getPropertyDetails(selectedPropertyId).color
                  )}
                  onMouseDown={() => handleMouseDown(day, hour)}
                  onMouseUp={() => handleMouseUp(day, hour)}
                />
              ))}

              {/* Render available time slots */}
              {events.map((event) => renderEvent(event, format(day, 'yyyy-MM-dd')))}

              {/* Render booked views on top */}
              {bookedViews.map((view) => renderBookedView(view, format(day, 'yyyy-MM-dd')))}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Horario</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Hora de Inicio</label>
              <input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="col-span-3 p-2 rounded-md border"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Hora de Fin</label>
              <input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="col-span-3 p-2 rounded-md border"
              />
            </div>
          </div>

          <DialogFooter>
            {onEventDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedEvent && onEventDelete) {
                    onEventDelete(selectedEvent)
                  }
                  setIsEditDialogOpen(false)
                }}
              >
                Eliminar
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleUpdateEvent}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 