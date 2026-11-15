function createChaoxingClawdRuntime({hostDocument,hostWindow}) {
  let destroyed=false,scrollHost=null,suppressManualScrollUntil=0;
  const clawdEnabled=()=>!destroyed;
  const isTypingActive=()=>generationEventActive;
  const BUTTON_CLASS='clawd-signoff-button',READY_CLASS='clawd-interactive-ready',EMPTY_CLASS='claude-empty-assistant',
    GENERATING_CLASS='claude-generation-active',MOBILE_LAYOUT_CLASS='clawd-mobile-layout',
    LEFT_SWIPE_PROXY_CLASS='claude-swipe-left-proxy',SWIPE_PROXY_CLASS='claude-swipe-right-proxy',
    REROLL_CLASS='claude-reroll-button',USER_ACTIONS_CLASS='claude-user-message-actions',
    SWIPE_VIEW_CLASS='claude-swipe-in-viewport',REGEX_SURFACE_CLASS='claude-transparent-regex-surface',
    STYLE_ID='cx-clawd-interaction-style';
  // CLAWD_IMAGE and the original controller declarations are inserted by the build.
