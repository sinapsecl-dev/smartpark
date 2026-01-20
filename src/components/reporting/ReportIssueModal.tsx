'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInfractionReport } from '@/app/lib/report-actions';
import { Tables } from '@/types/supabase';

// Define schema for report form validation
const reportSchema = z.object({
  report_type: z.enum(['exceeded_time', 'ghost_booking']), // 'required_error' is not an option for z.enum
  description: z.string().max(500).optional(),
  booking_id: z.string().min(1),
});

type ReportFormInputs = z.infer<typeof reportSchema>;

interface ReportIssueModalProps {
  bookingId: string;
  onClose: () => void;
}

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ bookingId, onClose }) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  }
    = useForm<ReportFormInputs>({
      resolver: zodResolver(reportSchema),
      defaultValues: {
        booking_id: bookingId,
      },
    });

  const onSubmit = async (data: ReportFormInputs) => {
    const formData = new FormData();
    formData.append('booking_id', data.booking_id);
    formData.append('report_type', data.report_type);
    if (data.description) {
      formData.append('description', data.description);
    }

    const result = await createInfractionReport(formData);

    if (result.success) {
      alert(result.message);
      onClose();
    } else {
      setError('root.serverError', { type: 'manual', message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">Report Issue</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="report_type" className="block text-sm font-medium text-gray-700">
              Report Type
            </label>
            <select
              id="report_type"
              {...register('report_type')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="">Select a report type</option>
              <option value="exceeded_time">Exceeded Time</option>
              <option value="ghost_booking">Ghost Booking</option>
            </select>
            {errors.report_type && (
              <p className="mt-1 text-sm text-red-600">{errors.report_type.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            ></textarea>
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {errors.root?.serverError && (
            <p className="mt-1 text-sm text-red-600">{errors.root.serverError.message}</p>
          )}

          <input type="hidden" {...register('booking_id')} value={bookingId} />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors disabled:bg-gray-400"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssueModal;
