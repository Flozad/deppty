'use client';

import { useState, useEffect, useCallback } from 'react';
import { WeeklyCalendar, TimeSlot } from '@/components/ui/calendar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface PropertyCalendarProps {
  propertyId: string;
}

interface Schedule {
  id: string;
  start_timestamp: string;
  end_timestamp: string;
  status: string;
  property_id: string;
}

export function PropertyCalendar({ propertyId }: PropertyCalendarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const supabase = createClientComponentClient();

  const fetchSchedules = useCallback(async () => {
    const { data, error } = await supabase
      .from('property_schedules')
      .select('*')
      .eq('property_id', propertyId);

    if (!error && data) {
      setSchedules(data);
    }
  }, [propertyId, supabase]);

  useEffect(() => {
    fetchSchedules();
  }, [propertyId, fetchSchedules]);

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
        .eq('property_id', propertyId)
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
          property_id: propertyId,
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
        setSchedules(prev => [...prev, newSchedule]);
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
          events={schedules as TimeSlot[]}
          onTimeSelect={handleTimeSelect}
          className="h-[600px] rounded-xl"
        />
      </div>

      <div className="flex items-center gap-6 text-sm bg-[#0A1120] p-4 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-blue-500"></div>
          <span className="text-gray-200">Available for visits</span>
        </div>
      </div>

      <p className="text-sm text-gray-400 italic">
        Click and drag to select available time slots
      </p>
    </div>
  );
} 