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
  selectedPropertyId?: string | null;
}

type ViewMode = 'all' | 'available' | 'visits';

// First, extend the TimeSlot type to include visit-specific fields
interface VisitTimeSlot extends TimeSlot {
  type: 'visit';
  client_name?: string;
  client_id?: string;
}

const getPropertyColor = (propertyId: string, properties: Property[], isVisit: boolean = false) => {
  const property = properties.find(p => p.id === propertyId);
  if (!property) return '';
  
  // Extract the color from property.color (assuming format like 'bg-blue-500')
  const [, baseColor] = property.color.split('-'); // Use comma instead of underscore
  
  // Return styles with clear visual distinction
  return isVisit 
    ? `bg-${baseColor}-900 opacity-90 z-10 border-2 border-${baseColor}-500 shadow-lg rounded-md ring-2 ring-white ring-opacity-20`
    : `bg-${baseColor}-50 opacity-30 border border-${baseColor}-200 border-dashed`;
};

// Update the event display function to use the proper type
const getEventDisplay = (event: TimeSlot) => {
  if ('type' in event && event.type === 'visit') {
    return `👥 Visit - ${(event as VisitTimeSlot).client_name || 'No client name'}`;
  }
  return '📅 Available';
};

export function MultiPropertyCalendar({ 
  properties,
  selectedPropertyId,
}: MultiPropertyCalendarProps) {
  const [schedules, setSchedules] = useState<TimeSlot[]>([]);
  const [visits, setVisits] = useState<VisitTimeSlot[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
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
      const formattedSchedules = data.map(schedule => ({
        ...schedule,
        className: getPropertyColor(schedule.property_id, properties)
      }));
      setSchedules(formattedSchedules);
    }
  }, [properties, supabase]);

  const fetchVisits = useCallback(async () => {
    const propertyIds = properties.map(p => p.id);
    const { data, error } = await supabase
      .from('property_visit')
      .select(`
        *
      `)
      .in('property_id', propertyIds);

      console.log(data);

    if (error) {
      console.error('Error fetching visits:', error);
      return;
    }

    if (data) {
      const formattedVisits = data.map(visit => ({
        id: visit.id,
        property_id: visit.property_id,
        start_timestamp: visit.start_date,
        end_timestamp: visit.end_date,
        status: visit.status,
        type: 'visit' as const,
        className: getPropertyColor(visit.property_id.toString(), properties, true),
        client_name: visit.clients?.name,
        client_id: visit.client_id
      }));
      setVisits(formattedVisits);
    }
  }, [properties, supabase]);

  useEffect(() => {
    fetchAllSchedules();
    fetchVisits();
  }, [fetchAllSchedules, fetchVisits]);

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
      const startTimestamp = `${pendingSchedule.date} ${pendingSchedule.startTime}`;
      const endTimestamp = `${pendingSchedule.date} ${pendingSchedule.endTime}`;

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

  const addThreeHours = (timestamp: string) => {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + 3);
    return date.toISOString();
  };

  const getCurrentEvents = () => {
    const transformEvents = (events: (TimeSlot | VisitTimeSlot)[]) => {
      return events.map(event => ({
        ...event,
        start_timestamp: addThreeHours(event.start_timestamp),
        end_timestamp: addThreeHours(event.end_timestamp)
      }));
    };

    switch (viewMode) {
      case 'available':
        return transformEvents(schedules);
      case 'visits':
        return transformEvents(visits);
      default:
        return [...transformEvents(schedules), ...transformEvents(visits)];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-100">Horarios de Propiedades</h3>
        <div className="flex items-center gap-4">
          {isLoading && (
            <span className="text-sm text-blue-400">Actualizando disponibilidad...</span>
          )}
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setViewMode('available')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'available'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              Disponibles
            </button>
            <button
              onClick={() => setViewMode('visits')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'visits'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              Visitas
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#0A1120] p-6 rounded-2xl border border-gray-800 shadow-xl">
        <WeeklyCalendar
          events={getCurrentEvents()}
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onTimeSelect={handleTimeSelect}
          getEventDisplay={getEventDisplay}
          className="h-[800px] rounded-xl"
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
        {properties.map(property => (
          <div key={property.id} className="space-y-2">
            {(viewMode === 'all' || viewMode === 'available') && (
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 ${getPropertyColor(property.id, properties)} rounded flex items-center justify-center`}>
                  <span className="text-xs">📅</span>
                </div>
                <span>{property.title} - Available</span>
              </div>
            )}
            {(viewMode === 'all' || viewMode === 'visits') && (
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 ${getPropertyColor(property.id, properties, true)} rounded flex items-center justify-center`}>
                  <span className="text-xs">👥</span>
                </div>
                <span>{property.title} - Visits</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Horario</DialogTitle>
            <DialogDescription>
              Agregar disponibilidad para {pendingSchedule?.date} de {pendingSchedule?.startTime} a {pendingSchedule?.endTime}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium">Seleccionar Propiedad:</label>
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
              Cancelar
            </Button>
            <Button onClick={handleConfirmSchedule} disabled={isLoading}>
              {isLoading ? 'Agregando...' : 'Agregar Horario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 