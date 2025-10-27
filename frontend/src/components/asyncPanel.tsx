import React from 'react';

type ActionResult = {
    message?: string;
    downloadUrl?: string;
};

type ControlledState = {
    isLoading?: boolean;
    error?: string | null;
    result?: ActionResult | null;
};

type AsyncActionPanelProps = {
    // Labels
    ctaLabel: string;
    loadingLabel?: string;

    // Action
    onAction?: () => Promise<ActionResult | void> | ActionResult | void;

    // Enable/disable logic
    canAction?: boolean;         // e.g. hasSelectedImage, hasLabeledImages
    disabledReason?: string;     // optional tooltip / explanation

    // Controlled state (optional)
    controlled?: ControlledState;

    // UI hooks
    onResultClick?: (result: ActionResult) => void; // e.g. open modal, navigate
    successRenderer?: (result: ActionResult) => React.ReactNode;

    // Style
    containerClassName?: string;
    buttonClassName?: string;
};

export const AsyncActionPanel: React.FC<AsyncActionPanelProps> = ({
    ctaLabel,
    loadingLabel = 'Working...',
    onAction,
    canAction = true,
    disabledReason,
    controlled,
    onResultClick,
    successRenderer,
    containerClassName = 'form-group',
    buttonClassName = 'button',
}) => {
    // Uncontrolled state (only used if `controlled` is not provided)
    const [localLoading, setLocalLoading] = React.useState(false);
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [localResult, setLocalResult] = React.useState<ActionResult | null>(null);

    const isControlled = Boolean(controlled);
    const isLoading = isControlled ? !!controlled?.isLoading : localLoading;
    const error = isControlled ? controlled?.error ?? null : localError;
    const result = isControlled ? controlled?.result ?? null : localResult;

    const handleClick = async () => {
        if (!onAction || isLoading) {
            return;
        }
        if (isControlled) {
            onAction();
            return;
        }
        // Uncontrolled mode
        setLocalError(null);
        setLocalResult(null);
        try {
            setLocalLoading(true);
            const r = await onAction();
            
            if (r && typeof r === 'object') {
                setLocalResult(r as ActionResult);
            } else {
                setLocalResult({ message: 'Done' });
            }
        } catch (e: any) {
            setLocalError(e?.message ?? 'Something went wrong');
        } finally {
            setLocalLoading(false);
        }
    };

    const disabled = !canAction || isLoading;

    return (
        <div className={containerClassName} style={{ marginTop: 'auto' }}>
            <button
                className={buttonClassName}
                onClick={handleClick}
                disabled={disabled}
                title={disabled && disabledReason ? disabledReason : undefined}
                aria-busy={isLoading || undefined}
                aria-disabled={disabled || undefined}
                type="button"
            >
                {isLoading ? loadingLabel : ctaLabel}
            </button>

            {/* Announce errors/success to screen readers */}
            <div aria-live="polite" style={{ marginTop: 8 }}>
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}

                {result && (
                    <div style={{ color: 'green' }}>
                        {successRenderer ? (
                            successRenderer(result)
                        ) : (
                            <>
                                <p>{result.message ?? 'Success.'}</p>
                                {result.downloadUrl && (
                                    <a
                                        href={result.downloadUrl}
                                        download
                                        className={buttonClassName}
                                        style={{ textDecoration: 'none', textAlign: 'center' }}
                                        onClick={() => onResultClick?.(result)}
                                    >
                                        Download
                                    </a>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
