import AuthHashHandler from '@/components/auth/AuthHashHandler';

export default function CompleteProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthHashHandler>
            {children}
        </AuthHashHandler>
    );
}
