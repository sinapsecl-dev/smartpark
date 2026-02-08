import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // 1. Redirect to login if accessing protected routes without user
    const protectedPaths = ['/dashboard', '/profile', '/admin']
    const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isProtected && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. Redirect to dashboard if logged in and accessing login/register
    if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 3. RBAC for /admin
    if (request.nextUrl.pathname.startsWith('/admin') && user) {
        // Fetch role from public.users
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role
        const allowedRoles = ['admin', 'developer']

        if (!role || !allowedRoles.includes(role)) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    // 4. Check Condominium Suspension
    if (user) {
        const { data: profile } = await supabase
            .from('users')
            .select('role, condominium_id, condominiums(status)')
            .eq('id', user.id)
            .single();

        const isDeveloper = profile?.role === 'developer';
        // @ts-ignore
        const isSuspended = profile?.condominiums?.status === 'suspended';

        // If suspended and NOT developer, redirect to /suspended
        // Allow access to /suspended to avoid loop
        // Allow access to /auth/signout (handled by Next.js/Supabase usually, but just in case)
        if (isSuspended && !isDeveloper && !request.nextUrl.pathname.startsWith('/suspended') && !request.nextUrl.pathname.startsWith('/auth')) {
            return NextResponse.redirect(new URL('/suspended', request.url));
        }

        // If NOT suspended (or is developer) and trying to access /suspended, redirect to dashboard
        if ((!isSuspended || isDeveloper) && request.nextUrl.pathname.startsWith('/suspended')) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
