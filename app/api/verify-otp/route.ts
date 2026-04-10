import { NextResponse } from 'next/server';

// 1. Tell TypeScript about our global cache variable here as well
declare global {
    var otpCache: Map<string, { code: string; expires: number }> | undefined;
}

// 2. Access the cache
const cache = global.otpCache || new Map<string, { code: string; expires: number }>();

export async function POST(request: Request) {
    try {
        const { email, code } = await request.json();

        // Retrieve the stored OTP data
        const storedData = cache.get(email);

        if (!storedData) {
            return NextResponse.json({ error: 'No code found. Please request a new one.' }, { status: 400 });
        }

        if (Date.now() > storedData.expires) {
            cache.delete(email); // Clean up expired code
            return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
        }

        if (storedData.code !== code) {
            return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
        }

        // Success! Clear the cache so it can't be reused
        cache.delete(email);
        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}