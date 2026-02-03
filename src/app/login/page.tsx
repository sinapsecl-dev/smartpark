'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientComponentClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ParkingLoader } from '@/components/ui/ParkingLoader';

const formSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type FormData = z.infer<typeof formSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [processingToken, setProcessingToken] = useState(false);

  // Handle magic link token from URL (can be in hash OR query params)
  useEffect(() => {
    const handleMagicLink = async () => {
      const hash = window.location.hash;
      const queryToken = searchParams.get('access_token');
      const queryRefreshToken = searchParams.get('refresh_token');

      // Check for tokens in hash OR query params
      const hasHashToken = hash && hash.includes('access_token');
      const hasQueryToken = !!queryToken;

      if (!hasHashToken && !hasQueryToken) {
        // Check for error in search params
        const errorParam = searchParams.get('error');
        if (errorParam === 'pending_approval') {
          setError('Tu cuenta está pendiente de aprobación. El administrador revisará tu solicitud y te notificaremos por correo electrónico cuando sea aprobada.');
        } else if (errorParam === 'suspended') {
          setError('Tu cuenta ha sido suspendida. Contacta al administrador de tu condominio.');
        } else if (errorParam === 'auth_failed') {
          setError('Error de autenticación. Por favor intenta nuevamente.');
        } else if (errorParam) {
          setError('Error de autenticación: ' + errorParam);
        }
        return;
      }

      setProcessingToken(true);

      try {
        let session = null;

        if (hasQueryToken && queryRefreshToken) {
          // Tokens are in query params - need to set session manually
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: queryToken,
            refresh_token: queryRefreshToken,
          });

          if (setSessionError) {
            console.error('Error setting session:', setSessionError);
            setError('Error al procesar el enlace. El enlace puede haber expirado.');
            setProcessingToken(false);
            return;
          }
          session = data.session;
        } else if (hasHashToken) {
          // Tokens are in hash - parse them manually
          const hashParams = new URLSearchParams(hash.substring(1));
          const hashAccessToken = hashParams.get('access_token');
          const hashRefreshToken = hashParams.get('refresh_token');

          if (!hashAccessToken || !hashRefreshToken) {
            console.error('Missing tokens in hash');
            setError('Enlace inválido. Solicita una nueva invitación.');
            setProcessingToken(false);
            return;
          }

          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });

          if (setSessionError) {
            console.error('Error setting session from hash:', setSessionError);
            setError('Error al procesar el enlace. El enlace puede haber expirado.');
            setProcessingToken(false);
            return;
          }
          session = data.session;
        }

        if (session?.user) {
          // Check if user has completed their profile
          const { data: userProfileData } = await supabase
            .from('users')
            .select('profile_completed, role')
            .eq('id', session.user.id as any)
            .single();

          const userProfile = userProfileData as any;

          // Clear the URL params/hash
          window.history.replaceState(null, '', window.location.pathname);

          if (!userProfile || !userProfile.profile_completed) {
            router.push('/complete-profile');
          } else if (userProfile.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
          return;
        } else {
          setError('No se pudo establecer la sesión. Intenta nuevamente.');
        }
      } catch (err) {
        console.error('Error processing magic link:', err);
        setError('Error al procesar el enlace.');
      }
      setProcessingToken(false);
    };

    handleMagicLink();
  }, [supabase, router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleEmailSignIn = useCallback(async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (authData?.user) {
        // Check user status in public.users
        const { data: userProfileData } = await supabase
          .from('users')
          .select('status, profile_completed, role')
          .eq('id', authData.user.id as any)
          .single();

        const userProfile = userProfileData as any;

        // Block pending users
        if (userProfile?.status === 'pending') {
          await supabase.auth.signOut();
          setError('Tu cuenta está pendiente de aprobación. El administrador revisará tu solicitud y te notificaremos por correo electrónico cuando sea aprobada.');
          setLoading(false);
          return;
        }

        // Block suspended users
        if (userProfile?.status === 'suspended') {
          await supabase.auth.signOut();
          setError('Tu cuenta ha sido suspendida. Contacta al administrador de tu condominio.');
          setLoading(false);
          return;
        }

        // Redirect based on profile completion and role
        if (!userProfile?.profile_completed) {
          router.push('/complete-profile');
        } else if (userProfile?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
        // Keep loading true while redirecting
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  }, [supabase, router]);

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const handleMagicLinkSignIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const email = getValues('email');
      if (!email) {
        setError('Please enter your email to receive a Magic Link.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        alert('Check your email for the Magic Link!');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [supabase, getValues]);

  if (loading) {
    return <ParkingLoader fullScreen text="Iniciando sesión..." />;
  }

  // Show loading screen while processing magic link
  if (processingToken) {
    return <ParkingLoader fullScreen text="Procesando enlace..." />;
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 bg-background-light dark:bg-background-dark transition-colors duration-300">
      <div className="w-full max-w-[480px] bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="relative w-full h-32 bg-primary/10 dark:bg-primary/5 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('/parking-pattern.svg')] bg-cover bg-center"></div>
          <div className="z-10 flex flex-col items-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white shadow-lg">
              <span className="material-symbols-outlined text-3xl">local_parking</span>
            </div>
            <span className="text-primary font-bold tracking-wider text-sm uppercase">SinaPark</span>
          </div>
        </div>
        <div className="p-8 pt-6">
          <div className="flex flex-col gap-1 mb-8 text-center">
            <h2 className="text-gray-900 dark:text-white tracking-tight text-[28px] font-bold leading-tight">Bienvenido de nuevo</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Ingresa tus datos para iniciar sesión.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(handleEmailSignIn)} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <p className="text-gray-900 dark:text-gray-200 text-sm font-medium leading-normal">Correo electrónico</p>
              <div className="relative">
                <input
                  className={cn(
                    "form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border bg-background-light dark:bg-background-dark focus:border-primary h-12 placeholder:text-gray-400 p-[15px] text-base font-normal leading-normal transition-all",
                    errors.email ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'
                  )}
                  id="email"
                  placeholder="apartment101@condo.cl"
                  type="email"
                  autoComplete="username"
                  suppressHydrationWarning
                  {...register('email')}
                  disabled={loading}
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">person</span>
              </div>
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </label>

            <label className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <p className="text-gray-900 dark:text-gray-200 text-sm font-medium leading-normal">Contraseña</p>
                <Link className="text-primary hover:text-primary/80 text-xs font-semibold transition-colors" href="/forgot-password">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="flex w-full flex-1 items-stretch rounded-lg group">
                <input
                  className={cn(
                    "form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 focus:z-10 border bg-background-light dark:bg-background-dark focus:border-primary h-12 placeholder:text-gray-400 p-[15px] pr-2 text-base font-normal leading-normal border-r-0 transition-all",
                    errors.password ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'
                  )}
                  id="password"
                  placeholder="••••••••"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  suppressHydrationWarning
                  {...register('password')}
                  disabled={loading}
                />
                <Button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  variant="ghost"
                  size="icon"
                  className="rounded-l-none border border-gray-200 dark:border-gray-600 border-l-0 h-12 w-12 shrink-0 aspect-square"
                  disabled={loading}
                >
                  <span className="material-symbols-outlined text-gray-400" data-size="24px">
                    {passwordVisible ? 'visibility_off' : 'visibility'}
                  </span>
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Recordarme
                  </label>
                </div>
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </label>

            <Button
              type="submit"
              className="w-full h-12 mt-2"
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="relative my-6">
            <div aria-hidden="true" className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-light dark:bg-surface-dark px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">O continuar con</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full h-12"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-6 w-6 mr-2">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,8.065,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,19.033-8.136,19.033-19.979C43.967,21.104,43.784,20.597,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,8.065,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,2.83,0.56,5.509,1.556,8.01L12.03,28.267L6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,4.809C7.514,39.564,15.08,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,8.065,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,19.033-8.136,19.033-19.979C43.967,21.104,43.784,20.597,43.611,20.083z"></path>
              </svg>
              Iniciar con Google
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleMagicLinkSignIn}
              className="w-full h-12"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[20px] text-primary mr-2">auto_fix_high</span>
              )}
              Ingresar con Magic Link
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
              ¿No tienes una cuenta?{' '}
              <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Solicitar acceso
              </Link>
            </p>
            <div className="mt-6 flex justify-center gap-4 text-xs text-gray-400">
              <Link className="hover:text-gray-600 dark:hover:text-gray-300" href="#">Privacidad</Link>
              <span>•</span>
              <Link className="hover:text-gray-600 dark:hover:text-gray-300" href="#">Términos</Link>
            </div>
            <p className="mt-2 text-xs text-gray-300 dark:text-gray-600">SinaPark © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<ParkingLoader fullScreen />}>
      <LoginPageContent />
    </Suspense>
  );
}