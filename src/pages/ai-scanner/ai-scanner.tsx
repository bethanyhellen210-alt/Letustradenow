import FeatureErrorBoundary from '@/components/feature-error-boundary';
import DigitPanel from '@/pages/bot-builder/digit-panel/digit-panel';
import './ai-scanner.scss';

const AiScanner = () => (
    <main className='ai-scanner-page' aria-label='AI Scanner'>
        <header className='ai-scanner-page__header'>
            <div>
                <p className='ai-scanner-page__eyebrow'>LIVE DERIV MARKET DATA</p>
                <h1>AI Scanner</h1>
                <p className='ai-scanner-page__description'>
                    Scan live digit distribution and recent market activity. Signals are analysis only, not a guarantee of a winning trade.
                </p>
            </div>
            <a
                className='ai-scanner-page__download'
                href='/ai-scanner/grffy.xml'
                download='ai-scanner-bot.xml'
            >
                Load Matching Bot XML
            </a>
        </header>
        <section className='ai-scanner-page__panel' aria-label='Live digit scanner'>
            <FeatureErrorBoundary featureName='AI Scanner'>
                <DigitPanel />
            </FeatureErrorBoundary>
        </section>
    </main>
);

export default AiScanner;
