import { ImageResponse } from 'next/og';
import {
  WIDTH,
  HEIGHT,
  normalizeText,
  loadFontData,
  fontsFromData,
  commonAssets,
  Background,
  Header,
  Footer,
  baseContainerStyle,
  addThousandsSeparators,
  Pill,
  WagerToWin,
} from '../_shared';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.has('debug')) {
      return new Response('ok', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    }

    const wagerRaw = normalizeText(searchParams.get('wager'), 32);
    const payoutRaw = normalizeText(searchParams.get('payout'), 32);
    const wager = addThousandsSeparators(wagerRaw);
    const payout = addThousandsSeparators(payoutRaw);
    const symbol = normalizeText(searchParams.get('symbol'), 16);

    // Validate and normalize Ethereum address (optional)
    const rawAddr = (searchParams.get('addr') || '').toString();
    const cleanedAddr = rawAddr.replace(/\s/g, '').toLowerCase();
    const addr = /^0x[a-f0-9]{40}$/.test(cleanedAddr) ? cleanedAddr : '';

    // Shared assets and fonts
    const { logoUrl, bgUrl } = commonAssets(req);

    // Parse legs passed as repeated `leg` params: text|Yes or text|No
    const rawLegs = searchParams.getAll('leg').slice(0, 12); // safety cap
    const legs = rawLegs
      .map((entry) => entry.split('|'))
      .map(([text, choice]) => ({
        text: normalizeText(text || '', 120),
        choice: (choice || '').toLowerCase() === 'yes' ? 'Yes' : 'No',
      }))
      .filter((l) => l.text);

    const fonts = await loadFontData(req);

    return new ImageResponse(
      (
        <div style={baseContainerStyle}>
          <Background bgUrl={bgUrl} />
          <Header logoUrl={logoUrl} />

          <div style={{ display: 'flex', gap: 28, alignItems: 'stretch' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 24,
                  opacity: 0.9,
                  whiteSpace: 'nowrap',
                }}
              >
                Predictions
              </div>
              {legs.length > 0 && (
                <>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    {legs.map((leg, idx) => {
                      const isYes = leg.choice === 'Yes';
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              fontSize: 28,
                              lineHeight: 1.25,
                              fontWeight: 600,
                              letterSpacing: -0.3,
                              opacity: 0.95,
                            }}
                          >
                            {leg.text}
                          </div>
                          <Pill
                            text={leg.choice}
                            tone={isYes ? 'success' : 'danger'}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {(wager || payout) && (
              <WagerToWin wager={wager} payout={payout} symbol={symbol} />
            )}
          </div>

          <Footer addr={addr} />
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts: fontsFromData(fonts),
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`OG route error: ${message}`, { status: 500 });
  }
}
