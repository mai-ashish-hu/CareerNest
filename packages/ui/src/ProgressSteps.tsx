import React from 'react';
import { cn } from './utils';
import { Check } from 'lucide-react';

export function ProgressSteps({
    steps,
    currentStep,
    className,
}: {
    steps: { id: string; label: string }[];
    currentStep: string;
    className?: string;
}) {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    return (
        <div className={cn('flex items-center w-full', className)}>
            {steps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;

                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                                    isCompleted && 'bg-emerald-500 text-white',
                                    isCurrent && 'bg-primary-600 text-white ring-4 ring-primary-100',
                                    !isCompleted && !isCurrent && 'bg-surface-200 text-surface-400'
                                )}
                            >
                                {isCompleted ? <Check size={14} /> : index + 1}
                            </div>
                            <span
                                className={cn(
                                    'text-xs font-medium whitespace-nowrap',
                                    isCurrent ? 'text-primary-700' : isCompleted ? 'text-emerald-600' : 'text-surface-400'
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    'flex-1 h-0.5 mx-3 mt-[-1.5rem]',
                                    index < currentIndex ? 'bg-emerald-500' : 'bg-surface-200'
                                )}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
