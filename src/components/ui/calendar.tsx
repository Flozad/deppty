"use client"

import * as React from "react"
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface TimeSlot {
  id: string
  start_timestamp: string
  end_timestamp: string
  status: string
  property_id?: string
}

interface WeeklyCalendarProps {
  className?: string
  selectedDate?: Date
  events?: TimeSlot[]
  onSlotSelect?: (date: Date) => void
  onTimeSelect?: (date: string, startTime: string, endTime: string) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const TIME_SLOT_HEIGHT = 60 // pixels per hour

export function WeeklyCalendar({
  className,
  selectedDate = new Date(),
  events = [],
  onTimeSelect,
}: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = React.useState(startOfWeek(selectedDate))
  const [isSelecting, setIsSelecting] = React.useState(false)
  const [selectionStart, setSelectionStart] = React.useState<{ date: Date, hour: number } | null>(null)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i))

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

  return (
    <div className={cn("flex flex-col h-full bg-slate-900 text-white", className)}>
      {/* Navigation Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousWeek}
          className="hover:bg-slate-800"
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
          className="hover:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Header */}
      <div className="flex border-b border-slate-700">
        <div className="w-20" />
        {weekDays.map((day) => (
          <div
            key={day.toString()}
            className={cn(
              "flex-1 p-2 text-center border-l border-slate-700",
              format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && "bg-slate-800"
            )}
          >
            <div className="font-semibold">{format(day, 'EEE')}</div>
            <div className="text-sm">{format(day, 'd')}</div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Time Labels */}
        <div className="w-20 flex-shrink-0">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-[60px] border-b border-slate-700 text-sm px-2 py-1"
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
              "flex-1 border-l border-slate-700 relative",
              format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && "bg-slate-800/50"
            )}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className={cn(
                  "h-[60px] border-b border-slate-700 hover:bg-slate-800 cursor-pointer",
                  isSelecting && selectionStart && 
                  format(day, 'yyyy-MM-dd') === format(selectionStart.date, 'yyyy-MM-dd') &&
                  hour >= Math.min(selectionStart.hour, hour) &&
                  hour <= Math.max(selectionStart.hour, hour) &&
                  "bg-blue-500/50"
                )}
                onMouseDown={() => handleMouseDown(day, hour)}
                onMouseUp={() => handleMouseUp(day, hour)}
              />
            ))}

            {/* Render existing events */}
            {events.map((event) => {
              const eventStart = new Date(event.start_timestamp);
              const eventEnd = new Date(event.end_timestamp);
              const dayStr = format(day, 'yyyy-MM-dd');
              const eventDayStr = format(eventStart, 'yyyy-MM-dd');
              
              if (dayStr === eventDayStr) {
                return (
                  <div
                    key={event.id}
                    className="absolute left-0 right-0 bg-blue-500 rounded m-1 px-2 overflow-hidden"
                    style={{
                      top: `${eventStart.getHours() * TIME_SLOT_HEIGHT}px`,
                      height: `${(eventEnd.getHours() - eventStart.getHours()) * TIME_SLOT_HEIGHT}px`,
                    }}
                  >
                    <div className="text-sm truncate">Available</div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
    </div>
  )
} 