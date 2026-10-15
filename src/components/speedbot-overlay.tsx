import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ChunkLoader from '@/components/loader/chunk-loader';
import FeatureErrorBoundary from '@/components/feature-error-boundary';
import './speedbot-overlay.scss';

const AiScanner = lazy(() => import('@/pages/ai-scanner'));

const SpeedBotOverlay = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <>
            {!isOpen && (
                <button
                    type='button'
                    className='speedbot-launcher'
                    onClick={() => setIsOpen(true)}
                    aria-label='Open SpeedBot AI scanner'
                >
                    <span className='speedbot-launcher__pulse' aria-hidden='true' />
                    <span>SpeedBot</span>
                </button>
            )}
            {isOpen && (
                <section className='speedbot-overlay' role='dialog' aria-modal='true' aria-label='SpeedBot AI scanner'>
                    <div className='speedbot-overlay__toolbar'>
                        <span className='speedbot-overlay__brand'>SpeedBot</span>
                        <span className='speedbot-overlay__status'>LIVE ANALYSIS</span>
                        <button type='button' className='speedbot-overlay__close' onClick={() => setIsOpen(false)}>
                            Close scanner
                        </button>
                    </div>
                    <div className='speedbot-overlay__content'>
                        <FeatureErrorBoundary featureName='SpeedBot AI Scanner'>
                            <Suspense fallback={<ChunkLoader message='Loading SpeedBot analysis...' />}>
                                <AiScanner />
                            </Suspense>
                        </FeatureErrorBoundary>
                    </div>
                </section>
            )}
        </>,
        document.body
    );
};

export default SpeedBotOverlay;
