(() => {
  'use strict';

  const MEASUREMENT_ID = 'G-Q5BGCQDCV6';
  const PRODUCTION_PROTOCOL = 'https:';
  const PRODUCTION_HOSTNAME = 'ny-an.github.io';
  const INTEGER_PARAMETERS = new Set([
    'dish_number',
    'dishes_completed',
    'moves_remaining',
    'recipe_level',
    'cooking_energy',
    'total_energy',
    'max_cooking_energy',
    'max_chain'
  ]);
  const EVENT_PARAMETERS = Object.freeze({
    puzzle_play_start: ['game_version', 'game_mode', 'category'],
    puzzle_resume: ['game_version', 'game_mode', 'category', 'dish_number', 'moves_remaining', 'total_energy'],
    puzzle_meal_complete: ['game_version', 'game_mode', 'category', 'dish_number', 'recipe_level', 'cooking_energy', 'total_energy', 'success_type'],
    puzzle_play_end: ['game_version', 'game_mode', 'category', 'end_reason', 'dishes_completed', 'total_energy', 'max_cooking_energy', 'max_chain', 'recipe_level'],
    share: ['method', 'content_type', 'item_id']
  });
  const FIXED_VALUES = Object.freeze({
    game_version: new Set(['v2', 'survival']),
    game_mode: new Set(['endless', 'normal', 'ex', 'survival']),
    category: new Set(['curry', 'salad', 'dessert', 'all']),
    end_reason: new Set(['moves_zero', 'week_complete', 'mode_change', 'manual_end']),
    success_type: new Set(['normal', 'extra_tasty', 'super_success']),
    method: new Set(['x']),
    content_type: new Set(['puzzle_result']),
    item_id: new Set(['v2', 'survival'])
  });

  let playOpen = false;
  let playEndSent = false;

  function setPageMarker(name, value) {
    try {
      document.documentElement.dataset[name] = value;
    } catch (_) {}
  }

  function isProductionLocation(location = window.location) {
    return location?.protocol === PRODUCTION_PROTOCOL && location?.hostname === PRODUCTION_HOSTNAME;
  }

  function initializeAnalytics() {
    if (!isProductionLocation()) {
      setPageMarker('puzzleAnalytics', 'disabled');
      return false;
    }
    setPageMarker('puzzleAnalytics', 'initializing');
    try {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', MEASUREMENT_ID);
      if (!document.querySelector('script[data-koiki-ga4]')) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
        script.dataset.koikiGa4 = 'true';
        script.addEventListener('load', () => setPageMarker('puzzleGa4', 'loaded'), { once: true });
        script.addEventListener('error', () => setPageMarker('puzzleGa4', 'failed'), { once: true });
        setPageMarker('puzzleGa4', 'loading');
        document.head.append(script);
      }
      setPageMarker('puzzleAnalytics', 'enabled');
      return true;
    } catch (_) {
      setPageMarker('puzzleAnalytics', 'failed');
      return false;
    }
  }

  function normalizeParameters(eventName, parameters) {
    const allowedKeys = EVENT_PARAMETERS[eventName] || [];
    const normalized = {};
    for (const key of allowedKeys) {
      const value = parameters?.[key];
      if (value === undefined || value === null || value === '') continue;
      if (INTEGER_PARAMETERS.has(key)) {
        const number = Number(value);
        if (Number.isFinite(number)) normalized[key] = Math.round(number);
        continue;
      }
      if (!FIXED_VALUES[key] || FIXED_VALUES[key].has(value)) normalized[key] = value;
    }
    return normalized;
  }

  function trackPuzzleEvent(eventName, parameters = {}) {
    if (!isProductionLocation() || !EVENT_PARAMETERS[eventName]) return false;
    try {
      if (typeof window.gtag !== 'function') return false;
      window.gtag('event', eventName, normalizeParameters(eventName, parameters));
      setPageMarker('puzzleAnalyticsEvent', eventName);
      return true;
    } catch (_) {
      return false;
    }
  }

  function startPlay(parameters) {
    if (playOpen) return false;
    playOpen = true;
    playEndSent = false;
    return trackPuzzleEvent('puzzle_play_start', parameters);
  }

  function resumePlay(parameters) {
    if (playOpen) return false;
    playOpen = true;
    playEndSent = false;
    return trackPuzzleEvent('puzzle_resume', parameters);
  }

  function completeMeal(parameters) {
    return trackPuzzleEvent('puzzle_meal_complete', parameters);
  }

  function endPlay(parameters) {
    if (playEndSent) return false;
    playOpen = false;
    playEndSent = true;
    return trackPuzzleEvent('puzzle_play_end', parameters);
  }

  function share(gameVersion) {
    return trackPuzzleEvent('share', {
      method: 'x',
      content_type: 'puzzle_result',
      item_id: gameVersion
    });
  }

  const enabled = initializeAnalytics();
  window.KoikiPuzzleAnalytics = Object.freeze({
    enabled,
    trackPuzzleEvent,
    startPlay,
    resumePlay,
    completeMeal,
    endPlay,
    share
  });
})();
