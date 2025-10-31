"use client";

import FireRiskDashboard from './components/FireRiskDashboard';
import ErrorBoundary from './components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <FireRiskDashboard />
    </ErrorBoundary>
  );
}