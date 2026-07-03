import React from 'react';
import { DevStats } from '../../types';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface DevStatsBárProps {
  stats: DevStats | null;
  isGenerating: boolean;
}

export default function DevStatsBar({ stats, isGenerating }: DevStatsBárProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {(stats || isGenerating) && (
        <motion.div
          className="dev-stats-bar"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
        >
          {isGenerating && !stats && (
            <span className="dev-stat">
              <span className="dev-stat-value">...</span>
              <span className="dev-stat-unit">{t('devStats.tokensPerSec')}</span>
            </span>
          )}

          {stats && (
            <>
              <span className="dev-stat">
                <span className="dev-stat-value">{stats.tokensPerSecond.toFixed(1)}</span>
                <span className="dev-stat-unit">{t('devStats.tokensPerSec')}</span>
              </span>
              <span className="dev-stat-sep">·</span>
              <span className="dev-stat">
                <span className="dev-stat-value">{stats.totalTokens}</span>
                <span className="dev-stat-unit">{t('devStats.totalTokens')}</span>
              </span>
              <span className="dev-stat-sep">·</span>
              <span className="dev-stat">
                <span className="dev-stat-value">{stats.promptTokens}</span>
                <span className="dev-stat-unit">{t('devStats.promptTokens')}</span>
              </span>
              <span className="dev-stat-sep">·</span>
              <span className="dev-stat">
                <span className="dev-stat-value">{stats.generationMs}</span>
                <span className="dev-stat-unit">{t('devStats.time')}</span>
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
