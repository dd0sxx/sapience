'use server';

import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

// Privy Native Gas Sponsorship relay.
// Expects JSON body: { walletId: string, chainId: number, to: string, data: string, value?: string, sponsor?: boolean }
// Builds a Privy RPC call to: https://api.privy.io/v1/wallets/<wallet_id>/rpc with required auth headers.

function createPrivyClient() {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      'Server not configured: missing PRIVY_APP_ID/PRIVY_APP_SECRET'
    );
  }
  // Create a new client per request to avoid racing on walletApi.updateAuthorizationKey
  return new PrivyClient(appId, appSecret);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, chainId, to, data, value, sponsor } = body ?? {};

    if (!walletId || typeof chainId !== 'number' || !to || !data) {
      return NextResponse.json(
        { error: 'Invalid request: expected { walletId, chainId, to, data }' },
        { status: 400 }
      );
    }

    // Verify caller's Privy access token from Authorization header (Bearer token required)
    const authHeader = request.headers.get('authorization') || '';
    let token = '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice('bearer '.length).trim();
    }
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: missing Privy access token' },
        { status: 401 }
      );
    }
    try {
      const client = createPrivyClient();
      await client.verifyAuthToken(token);
    } catch (_err) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid token' },
        { status: 401 }
      );
    }

    const caip2 = `eip155:${chainId}`;
    const client = createPrivyClient();

    const { authorizationKey } = await client.walletApi.generateUserSigner({
      userJwt: token,
    });

    client.walletApi.updateAuthorizationKey(authorizationKey);

    // Use Privy Server Auth SDK to send a sponsored transaction
    const result = await client.walletApi.ethereum.sendTransaction({
      walletId,
      caip2,
      transaction: {
        to,
        data,
        ...(value ? { value } : {}),
      },
      sponsor: sponsor !== false,
    } as any);

    // Normalize response to match existing frontend expectations
    const response = {
      transactionHash: result?.hash,
      caip2: result?.caip2,
      receipts: result?.hash ? [{ transactionHash: result.hash }] : undefined,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
