import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces } from '@/components/shared';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { Localize } from '@deriv-com/translations';

const DISPLAY_CURRENCIES = ['USD', 'KES'] as const;
type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];
const DEFAULT_USD_KES_RATE = 129;

const formatAccountBalance = (amount: number | string, sourceCurrency: string, displayCurrency: DisplayCurrency, rate: number) => {
    const numericAmount = Number(String(amount ?? 0).replace(/,/g, ''));
    if (!Number.isFinite(numericAmount)) return '—';
    const source = (sourceCurrency || 'USD').toUpperCase();
    if (source !== 'USD' && source !== 'KES') {
        return `${addComma(numericAmount.toFixed(getDecimalPlaces(source)))} ${getCurrencyDisplayCode(source)}`;
    }
    let converted = numericAmount;
    if (source === 'USD' && displayCurrency === 'KES') converted = numericAmount * rate;
    if (source === 'KES' && displayCurrency === 'USD') converted = numericAmount / rate;
    const formatted = addComma(converted.toFixed(2));
    return displayCurrency === 'KES' ? `KSh ${formatted}` : `USD ${formatted}`;
}
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import './account-switcher.scss';

const AccountSwitcher = observer(({ activeAccount }: TAccountSwitcher) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
    const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>(() =>
        localStorage.getItem('display_currency') === 'KES' ? 'KES' : 'USD'
    );
    const [usdKesRate, setUsdKesRate] = useState(DEFAULT_USD_KES_RATE);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { accountList, activeLoginid } = useApiBase();
    const { client, run_panel } = useStore() ?? {};

    const is_bot_running = run_panel?.is_running || api_base.is_running;
    const isSingleAccount = !accountList || accountList.length <= 1;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsCurrencyMenuOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setIsOpen(false); setIsCurrencyMenuOpen(false); }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('display_currency', displayCurrency);
        if (displayCurrency !== 'KES') return;
        let cancelled = false;
        const fetchRate = async () => {
            try {
                const response = await fetch('https://open.er-api.com/v6/latest/USD');
                if (!response.ok) throw new Error(`Exchange-rate request failed: ${response.status}`);
                const data = await response.json();
                const rate = Number(data?.rates?.KES);
                if (!cancelled && Number.isFinite(rate) && rate > 0) setUsdKesRate(rate);
            } catch {
                // Keep the last valid rate (or the documented fallback) if the rate service is unavailable.
            }
        };
        void fetchRate();
        const timer = window.setInterval(() => void fetchRate(), 10 * 60 * 1000);
        return () => { cancelled = true; window.clearInterval(timer); };
    }, [displayCurrency]);

    const handleDisplayCurrencySelect = useCallback((currencyCode: DisplayCurrency) => {
        setDisplayCurrency(currencyCode);
        setIsCurrencyMenuOpen(false);
    }, []);

    const toggleDropdown = useCallback(() => {
        if (is_bot_running || isSingleAccount) return;
        setIsOpen(prev => !prev);
    }, [is_bot_running, isSingleAccount]);

    const handleAccountSelect = useCallback(
        (loginid: string) => {
            localStorage.setItem('active_loginid', loginid);
            client?.checkAndRegenerateWebSocket();
            setIsOpen(false);
        },
        [client]
    );

    const formattedAccounts = useMemo(() => {
        if (!accountList) return [];
        return accountList
            .map(account => ({
                loginid: account.loginid,
                currency: account.currency,
                balance: addComma(Number(account.balance ?? 0).toFixed(getDecimalPlaces(account.currency))),
                isVirtual: isDemoAccount(account.loginid),
                isActive: account.loginid === activeLoginid,
            }))
            .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));
    }, [accountList, activeLoginid]);

    if (!activeAccount) return null;

    const { currency, isVirtual, balance } = activeAccount;
    const showChevron = !isSingleAccount && !is_bot_running;

    return (
        <div className='acc-info__wrapper' ref={wrapperRef}>
            <AccountInfoWrapper>
                <div className='acc-info__currency-switcher'>
                    <button
                        className='acc-info__currency-button'
                        type='button'
                        aria-label='Choose balance display currency'
                        aria-expanded={isCurrencyMenuOpen}
                        aria-haspopup='listbox'
                        onClick={event => { event.stopPropagation(); setIsCurrencyMenuOpen(open => !open); }}
                    >
                        {displayCurrency === 'KES' ? 'KSH' : 'USD'}
                        <span aria-hidden='true'>⌄</span>
                    </button>
                    {isCurrencyMenuOpen && (
                        <div className='acc-info__currency-menu' role='listbox' aria-label='Balance currency'>
                            {DISPLAY_CURRENCIES.map(option => (
                                <button
                                    key={option}
                                    type='button'
                                    role='option'
                                    aria-selected={option === displayCurrency}
                                    className={`acc-info__currency-option${option === displayCurrency ? ' acc-info__currency-option--active' : ''}`}
                                    onClick={event => { event.stopPropagation(); handleDisplayCurrencySelect(option); }}
                                >
                                    {option === 'KES' ? 'KSH (Kenyan shilling)' : 'USD (US dollar)'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div
                    data-testid='dt_acc_info'
                    id='dt_core_account-info_acc-info'
                    role={showChevron ? 'button' : undefined}
                    tabIndex={showChevron ? 0 : -1}
                    aria-expanded={showChevron ? isOpen : undefined}
                    aria-haspopup={showChevron ? 'listbox' : undefined}
                    className={classNames('acc-info', {
                        'acc-info--is-virtual': isVirtual,
                        'acc-info--interactive': showChevron,
                    })}
                    onClick={toggleDropdown}
                    onKeyDown={e => {
                        if (showChevron && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            toggleDropdown();
                        }
                    }}
                >
                    <span className='acc-info__id' aria-hidden='true'></span>
                    <div className='acc-info__content'>
                        <div className='acc-info__account-type-header'>
                            <Text as='p' size='xs' className='acc-info__account-type'>
                                {isVirtual ? (
                                    <Localize i18n_default_text='Demo account' />
                                ) : (
                                    <Localize i18n_default_text='Real account' />
                                )}
                            </Text>
                            {showChevron && (
                                <span
                                    className={classNames('acc-info__select-arrow', {
                                        'acc-info__select-arrow--invert': isOpen,
                                    })}
                                >
                                    <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                                        <path
                                            d='M2 4L6 8L10 4'
                                            stroke='currentColor'
                                            strokeWidth='1.5'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        />
                                    </svg>
                                </span>
                            )}
                        </div>
                        {(typeof balance !== 'undefined' || !currency) && (
                            <div className='acc-info__balance-section'>
                                <p
                                    data-testid='dt_balance'
                                    className={classNames('acc-info__balance', {
                                        'acc-info__balance--no-currency': !currency && !isVirtual,
                                    })}
                                >
                                    {!currency ? (
                                        <Localize i18n_default_text='No currency assigned' />
                                    ) : (
                                        formatAccountBalance(balance, currency, displayCurrency, usdKesRate)
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </AccountInfoWrapper>
            {isOpen && (
                <div className='acc-dropdown' role='listbox'>
                    {formattedAccounts.map(account => (
                        <div
                            key={account.loginid}
                            role='option'
                            aria-selected={account.isActive}
                            tabIndex={0}
                            className={classNames('acc-dropdown__account', {
                                'acc-dropdown__account--selected': account.isActive,
                                'acc-dropdown__account--virtual': account.isVirtual,
                            })}
                            onClick={() => !account.isActive && handleAccountSelect(account.loginid)}
                            onKeyDown={e => {
                                if (!account.isActive && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    handleAccountSelect(account.loginid);
                                }
                            }}
                        >
                            <Text
                                size='xxxs'
                                className={classNames('acc-dropdown__account-type', {
                                    'acc-dropdown__account-type--virtual': account.isVirtual,
                                })}
                            >
                                {account.isVirtual ? (
                                    <Localize i18n_default_text='Demo account' />
                                ) : (
                                    <Localize i18n_default_text='Real account' />
                                )}
                            </Text>
                            <Text size='xs' weight='bold' className='acc-dropdown__balance'>
                                {account.currency ? (
                                    formatAccountBalance(account.balance, account.currency, displayCurrency, usdKesRate)
                                ) : (
                                    <Localize i18n_default_text='No currency assigned' />
                                )}
                            </Text>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default AccountSwitcher;
