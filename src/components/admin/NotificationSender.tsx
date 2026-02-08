'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendCondoBroadcast } from '@/app/lib/broadcast-actions';
import { Bell, Send, Loader2, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationSender() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !body.trim()) {
            toast.error('Por favor completa todos los campos.');
            return;
        }

        if (title.length > 50) {
            toast.error('El título no puede exceder los 50 caracteres.');
            return;
        }

        if (body.length > 150) {
            toast.error('El mensaje no puede exceder los 150 caracteres.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await sendCondoBroadcast(title, body);

            if (result.success) {
                toast.success(result.message);
                setTitle('');
                setBody('');
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Error al enviar la notificación.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full">
            {/* Main Card */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Top Gradient Bar */}
                <div className="h-1.5 w-full bg-primary" />

                {/* Header */}
                <div className="px-5 pt-6 pb-4 sm:px-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/25">
                                <Megaphone className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Nueva Notificación
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Envía alertas importantes a toda la comunidad
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSend}>
                    <div className="px-5 pb-5 space-y-5 sm:px-6">
                        {/* Title Field */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="title"
                                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                            >
                                Título del Mensaje
                            </Label>
                            <Input
                                id="title"
                                placeholder="Ej: Mantenimiento Programado"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={50}
                                required
                                className="h-12 text-base bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-400"
                            />
                            <div className="flex justify-end">
                                <span className={cn(
                                    "text-xs font-medium tabular-nums",
                                    title.length > 40
                                        ? "text-amber-500 dark:text-amber-400"
                                        : "text-gray-400 dark:text-gray-500"
                                )}>
                                    {title.length}/50
                                </span>
                            </div>
                        </div>

                        {/* Body Field */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="body"
                                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                            >
                                Contenido del Mensaje
                            </Label>
                            <Textarea
                                id="body"
                                placeholder="Describe los detalles importantes para la comunidad..."
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                maxLength={150}
                                rows={4}
                                required
                                className="text-base bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none placeholder:text-gray-400"
                            />
                            <div className="flex justify-end">
                                <span className={cn(
                                    "text-xs font-medium tabular-nums",
                                    body.length > 130
                                        ? "text-amber-500 dark:text-amber-400"
                                        : "text-gray-400 dark:text-gray-500"
                                )}>
                                    {body.length}/150
                                </span>
                            </div>
                        </div>

                        {/* Warning Alert */}
                        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                            <div className="flex-shrink-0 mt-0.5">
                                <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                                <span className="font-semibold">Importante:</span> Esta notificación llegará como alerta push a todos los residentes con la app instalada.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isLoading || !title.trim() || !body.trim()}
                            className={cn(
                                "w-full h-14 text-base font-semibold rounded-xl transition-all duration-300",
                                "bg-primary hover:bg-primary/90 text-primary-foreground",
                                "shadow-lg shadow-primary/25 hover:shadow-primary/40",
                                "active:scale-[0.98]",
                                "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
                            )}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Enviando...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-3">
                                    <Send className="w-5 h-5" />
                                    <span>Enviar Broadcast</span>
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
