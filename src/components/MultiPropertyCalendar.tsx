'use client';

import { useState, useEffect, useCallback } from 'react';
import { WeeklyCalendar, TimeSlot } from '@/components/ui/calendar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Property {
  id: string;
  title: string;
  color: string;
}

interface MultiPropertyCalendarProps {
  properties: Property[];
}

const PROPERTY_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-indigo-500',
];

export function MultiPropertyCalendar({ properties }: MultiPropertyCalendarProps) {
  const [schedules, setSchedules] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState<{
    propertyId: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  
  const supabase = createClientComponentClient();

  const fetchAllSchedules = useCallback(async () => {
    const propertyIds = properties.map(p => p.id);
    const { data, error } = await supabase
      .from('property_schedules')
      .select('*')
      .in('property_id', propertyIds);

    if (!error && data) {
      setSchedules(data);
    }
  }, [properties, supabase]);

  useEffect(() => {
    fetchAllSchedules();
  }, [fetchAllSchedules]);

  const handleTimeSelect = async (date: string, startTime: string, endTime: string) => {
    setPendingSchedule({
      propertyId: properties[0].id, // Default to first property
      date,
      startTime,
      endTime
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmSchedule = async () => {
    if (!pendingSchedule) return;
    
    setIsLoading(true);
    try {
      const startTimestamp = new Date(`${pendingSchedule.date}T${pendingSchedule.startTime}`).toISOString();
      const endTimestamp = new Date(`${pendingSchedule.date}T${pendingSchedule.endTime}`).toISOString();

      const { data: existingSchedules } = await supabase
        .from('property_schedules')
        .select('*')
        .eq('property_id', pendingSchedule.propertyId)
        .gte('start_timestamp', startTimestamp)
        .lte('end_timestamp', endTimestamp);

      if (existingSchedules && existingSchedules.length > 0) {
        alert('This time slot overlaps with existing schedules');
        return;
      }

      const { data: newSchedule, error } = await supabase
        .from('property_schedules')
        .insert({
          property_id: pendingSchedule.propertyId,
          start_timestamp: startTimestamp,
          end_timestamp: endTimestamp,
          status: 'available'
        })
        .select()
        .single();

      if (error) throw error;

      if (newSchedule) {
        setSchedules(prev => [...prev, newSchedule]);
      }
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert('Failed to add schedule. Please try again.');
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setPendingSchedule(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-100">Property Schedules</h3>
        {isLoading && (
          <span className="text-sm text-blue-400">Updating availability...</span>
        )}
      </div>

      <div className="bg-[#0A1120] p-6 rounded-2xl border border-gray-800 shadow-xl">
        <WeeklyCalendar
          events={schedules}
          onTimeSelect={handleTimeSelect}
          className="h-[600px] rounded-xl"
        />
      </div>

      <div className="flex items-center gap-4 flex-wrap text-sm bg-[#0A1120] p-4 rounded-xl border border-gray-800">
        {properties.map((property, index) => (
          <div key={property.id} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-lg ${PROPERTY_COLORS[index % PROPERTY_COLORS.length]}`}></div>
            <span className="text-gray-200">{property.title}</span>
          </div>
        ))}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Schedule</DialogTitle>
            <DialogDescription>
              Add availability for {pendingSchedule?.date} from {pendingSchedule?.startTime} to {pendingSchedule?.endTime}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium">Select Property:</label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-md p-2"
                value={pendingSchedule?.propertyId}
                onChange={(e) => setPendingSchedule(prev => prev ? {...prev, propertyId: e.target.value} : null)}
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSchedule} disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 