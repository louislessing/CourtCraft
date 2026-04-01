'use client';

import React from 'react';

const stats = [
  {
    value: '80%',
    label: 'Unrepresented',
    variant: 'navy',
  },
  {
    value: '50+',
    label: 'Templates',
    variant: 'light',
  },
  {
    value: '£35',
    label: 'Per month',
    variant: 'gold',
  },
];

const TrustStatsSection: React.FC = () => {
  return (
    <section className="py-8 sm:py-10 lg:py-14 px-4 sm:px-6 bg-white" id="stats">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl sm:rounded-2xl flex flex-col items-center justify-center py-5 sm:py-8 px-3 sm:px-6 text-center
                ${stat.variant === 'navy' ? 'bg-navy-900' : ''}
                ${stat.variant === 'light' ? 'bg-gray-100 border border-gray-200' : ''}
                ${stat.variant === 'gold' ? 'bg-amber-50 border border-amber-200' : ''}
              `}
            >
              <span
                className={`font-display font-900 text-2xl sm:text-4xl lg:text-5xl leading-none mb-1 sm:mb-2
                  ${stat.variant === 'navy' ? 'text-gold-400' : ''}
                  ${stat.variant === 'light' ? 'text-navy-900' : ''}
                  ${stat.variant === 'gold' ? 'text-gold-600' : ''}
                `}
              >
                {stat.value}
              </span>
              <span
                className={`text-xs sm:text-sm font-medium tracking-wide
                  ${stat.variant === 'navy' ? 'text-white/70' : ''}
                  ${stat.variant === 'light' ? 'text-navy-600' : ''}
                  ${stat.variant === 'gold' ? 'text-amber-700' : ''}
                `}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStatsSection;