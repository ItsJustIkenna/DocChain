import { NextRequest, NextResponse } from 'next/server';
import { getTransactionDetails, getExplorerUrl } from '@/lib/sui';

export async function GET(
  request: NextRequest,
  { params }: { params: { digest: string } }
) {
  try {
    const { digest } = params;

    if (!digest) {
      return NextResponse.json(
        { error: 'Transaction digest is required' },
        { status: 400 }
      );
    }

    // Fetch transaction from Sui blockchain
    const transaction = await getTransactionDetails(digest);

    // Get explorer URL
    const explorerUrl = getExplorerUrl(digest);

    return NextResponse.json({
      transaction,
      explorerUrl,
      network: process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet',
    });
  } catch (error: any) {
    console.error('Error fetching blockchain transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction', details: error.message },
      { status: 500 }
    );
  }
}
