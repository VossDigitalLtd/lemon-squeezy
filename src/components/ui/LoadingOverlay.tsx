// components/ui/LoadingOverlay.tsx
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Loader2, Check, LucideIcon } from 'lucide-react';

interface LoadingStep {
  id?: string | number;
  label: string;
  icon?: LucideIcon;
  estimatedTime?: number;
}

interface LoadingOverlayProps {
  isVisible?: boolean;
  title?: string;
  description?: string;
  steps?: LoadingStep[];
  onCancel?: (() => void) | null;
  showProgress?: boolean;
  autoProgress?: boolean;
  forceComplete?: boolean;
  className?: string;
}

export default function LoadingOverlay({
  isVisible = false,
  title = 'Processing...',
  description = 'Please wait while we complete your request',
  steps = [],
  onCancel = null,
  showProgress = true,
  autoProgress = true,
  forceComplete = false,
  className = '',
}: LoadingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isInternallyComplete, setIsInternallyComplete] = useState(false);

  const getTotalEstimatedTime = (): number =>
    steps.reduce((sum, step) => sum + (step.estimatedTime || 3), 0);

  useEffect(() => {
    if (forceComplete && !isInternallyComplete) {
      setCurrentStep(steps.length - 1);
      setIsInternallyComplete(true);
      const totalTime = getTotalEstimatedTime();
      if (timeElapsed < totalTime) setTimeElapsed(totalTime);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceComplete, isInternallyComplete, steps.length, timeElapsed]);

  useEffect(() => {
    if (!isVisible || !autoProgress || steps.length === 0 || isInternallyComplete) {
      if (!isVisible) {
        setCurrentStep(0);
        setTimeElapsed(0);
        setIsInternallyComplete(false);
      }
      return;
    }

    let totalTime = 0;
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
      totalTime += 1;

      let cumulativeTime = 0;
      for (let i = 0; i < steps.length; i++) {
        cumulativeTime += (steps[i].estimatedTime || 3);
        if (totalTime <= cumulativeTime) {
          setCurrentStep(i);
          break;
        }
      }
      if (totalTime > getTotalEstimatedTime()) {
        setCurrentStep(steps.length - 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, autoProgress, steps, isInternallyComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const getProgressPercentage = (): number => {
    if (!showProgress || steps.length === 0) return 0;
    return Math.min((timeElapsed / getTotalEstimatedTime()) * 100, 100);
  };

  const isCompleted = isInternallyComplete || (currentStep >= steps.length - 1 && timeElapsed >= getTotalEstimatedTime());
  const isLongRunning = timeElapsed > getTotalEstimatedTime() + 10;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className={`relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto ${className}`}>
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${
                isCompleted ? 'bg-green-100 scale-110' : 'bg-brand-muted'
              }`}>
                {isCompleted
                  ? <Check className="w-8 h-8 text-green-600 animate-bounce" />
                  : <Loader2 className="w-8 h-8 text-primary animate-spin" />
                }
              </div>
              <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
                isCompleted ? 'text-green-900' : 'text-gray-900'
              }`}>
                {isCompleted ? 'Complete!' : title}
              </h3>
              <p className={`text-sm transition-colors duration-300 ${
                isCompleted ? 'text-green-600' : 'text-gray-600'
              }`}>
                {isCompleted ? 'Your request has been processed successfully!' : description}
              </p>
            </div>
          </div>

          {showProgress && steps.length > 0 && (
            <div className="px-6 py-6">
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(getProgressPercentage())}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                      isCompleted ? 'bg-green-500' : 'bg-primary'
                    }`}
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => {
                  const StepIcon = step.icon || Clock;
                  const isStepActive = index === currentStep;
                  const isStepCompleted = index < currentStep;

                  return (
                    <div
                      key={step.id ?? index}
                      className={`flex items-center space-x-3 transition-all duration-500 ${
                        isStepActive ? 'transform scale-105' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isStepCompleted
                          ? 'bg-green-100 text-green-600'
                          : isStepActive
                          ? 'bg-brand-muted text-foreground'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <StepIcon className={`w-4 h-4 ${isStepActive ? 'animate-pulse' : ''}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium transition-colors duration-300 ${
                          isStepCompleted ? 'text-green-600' : isStepActive ? 'text-foreground' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </p>
                        {isStepActive && step.estimatedTime && (
                          <p className="text-xs text-gray-400 mt-1">Estimated: {step.estimatedTime}s</p>
                        )}
                      </div>
                      {isStepCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {isStepActive && (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(!showProgress || steps.length === 0) && (
            <div className="px-6 py-8 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Please wait...</p>
            </div>
          )}

          {showProgress && (
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Time elapsed: {formatTime(timeElapsed)}</span>
                {isLongRunning && (
                  <span className="text-amber-600 font-medium">Taking longer than expected...</span>
                )}
              </div>
              {isLongRunning && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">This is taking longer than usual. Please continue waiting.</p>
                  {onCancel && (
                    <button onClick={onCancel} className="mt-2 text-sm text-amber-700 hover:text-amber-900 underline" type="button">
                      Cancel and try again
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
