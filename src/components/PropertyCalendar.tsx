'use client';

import { useState, useEffect } from 'react';
import { WeeklyCalendar } from '@/components/ui/calendar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { PropertySchedule, PropertyVisit, TimeSlot } from '@/types/calendar';

interface Property {
  id: string;
  title: string;
  color: string;
}

interface PropertyCalendarProps {
  properties: Property[]
  selectedPropertyId?: string | null
  // ... other props
}

export function PropertyCalendar({ 
  properties,
  selectedPropertyId,
  // ... other props 
}: PropertyCalendarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedPropertyId) return;

      // Fetch schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('property_schedules')
        .select('*')
        .eq('property_id', selectedPropertyId);

      // Fetch visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('property_visit')
        .select('*')
        .eq('property_id', selectedPropertyId);

      if (schedulesError || visitsError) {
        console.error('Error fetching data:', schedulesError || visitsError);
        return;
      }

      // Convert schedules to TimeSlots
      const scheduleSlots: TimeSlot[] = (schedulesData || []).map((schedule: PropertySchedule) => ({
        id: schedule.id,
        start_timestamp: schedule.start_timestamp,
        end_timestamp: schedule.end_timestamp,
        type: 'schedule',
        status: schedule.status,
        className: 'bg-blue-200 opacity-50'
      }));

      // Convert visits to TimeSlots
      const visitSlots: TimeSlot[] = (visitsData || []).map((visit: PropertyVisit) => ({
        id: visit.id,
        start_timestamp: visit.start_date,
        end_timestamp: visit.end_date,
        type: 'visit',
        status: visit.status,
        className: 'bg-green-500 opacity-75 z-10' // Higher z-index to show on top
      }));

      // Combine both types of slots
      setTimeSlots([...scheduleSlots, ...visitSlots]);
    };

    fetchData();
  }, [selectedPropertyId, supabase]);

  const handleTimeSelect = async (date: string, startTime: string, endTime: string) => {
    setIsLoading(true);
    try {
      // Convert date and times to timestamps
      const startTimestamp = new Date(`${date}T${startTime}`).toISOString();
      const endTimestamp = new Date(`${date}T${endTime}`).toISOString();

      // Check for overlapping schedules using a range query
      const { data: existingSchedules, error: checkError } = await supabase
        .from('property_schedules')
        .select('*')
        .eq('property_id', selectedPropertyId)
        .gte('start_timestamp', startTimestamp)
        .lte('end_timestamp', endTimestamp);

      if (checkError) {
        throw checkError;
      }

      if (existingSchedules && existingSchedules.length > 0) {
        alert('This time slot overlaps with existing schedules');
        return;
      }

      const { data: newSchedule, error } = await supabase
        .from('property_schedules')
        .insert({
          property_id: selectedPropertyId,
          start_timestamp: startTimestamp,
          end_timestamp: endTimestamp,
          status: 'available'
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      if (newSchedule) {
        setTimeSlots(prev => [...prev, newSchedule]);
      }
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert('Failed to add schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-100">Property Schedule</h3>
        {isLoading && (
          <span className="text-sm text-blue-400">Updating availability...</span>
        )}
      </div>
      
      <div className="bg-[#0A1120] p-6 rounded-2xl border border-gray-800 shadow-xl">
        <WeeklyCalendar
          events={timeSlots}
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onTimeSelect={handleTimeSelect}
          className="h-[800px] rounded-xl"
        />
      </div>

      <div className="flex gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-200 opacity-50 rounded"></div>
          <span>Available Times</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 opacity-75 rounded"></div>
          <span>Scheduled Visits</span>
        </div>
      </div>

      <p className="text-sm text-gray-400 italic">
        Click and drag to select available time slots
      </p>
    </div>
  );
} 