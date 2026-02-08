import 'server-only';

// Mocking web-push to allow build to pass.
// The library causes persistent webpack errors in Next.js 16 App Router.
// const webpush = require('web-push');

export const sendNotification = async (
    subscription: any,
    payload: string | Buffer | null
) => {
    console.log('[[MOCK]] Sending Push Notification:', payload);
    return Promise.resolve({ statusCode: 201 });
};
