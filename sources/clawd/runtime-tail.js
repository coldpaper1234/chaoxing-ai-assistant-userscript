  // Theme hooks belonging to the host application stay outside the animation engine.
  // Only selector scoping changes; durations, probabilities, tier/physics and frame
  // definitions above are taken from the installed Claude Web runtime.
  const originalInstallStyle=installStyle;
  installStyle=()=>{
    originalInstallStyle();
    const style=hostDocument.getElementById(STYLE_ID);
    if(style)style.textContent=style.textContent.replaceAll('body.','.cx-clawd-surface.').replaceAll('body ','.cx-clawd-surface ');
  };
  const bindings=[];
  const bind=(type,handler,capture=false)=>{hostDocument.addEventListener(type,handler,capture);bindings.push([type,handler,capture]);};
  const focusChange=()=>{noteActivity();syncClawdBState();};
  const readingIntent=event=>{if(event.target?.id==='send_textarea'){clawdReadingGate.reset();return;}handleClawdReadingIntent(event);};
  const resize=()=>scheduleA2BoundsWarm();
  const readingScroll=()=>{clawdScrollTilt();};
  const destroyRuntime=()=>{
      if(destroyed)return;destroyed=true;generationEventActive=false;
      hostWindow.clearInterval(clawdRuntimeTimer);
      if(clawdRigPrewarmTimer){
        if(clawdRigPrewarmIsIdle)hostWindow.cancelIdleCallback?.(clawdRigPrewarmTimer);
        else hostWindow.clearTimeout(clawdRigPrewarmTimer);
      }
      for(const id of clawdFrames)hostWindow.cancelAnimationFrame(id);
      for(const id of clawdTimers)hostWindow.clearTimeout(id);
      clawdFrames.clear();clawdTimers.clear();
      for(const [type,handler,capture]of bindings)hostDocument.removeEventListener(type,handler,capture);
      hostWindow.removeEventListener('resize',resize);
      scrollHost?.removeEventListener('scroll',readingScroll);
      clawdRhythm?.destroy();clawdPile.destroy();clawdFormRO?.disconnect();
      for(const clock of clawdBlinkClocks.values())clock.destroy();clawdBlinkClocks.clear();
      A2.flying++;A2.seqRun++;cleanupClawdRigEffects();
  };
  try {
    installStyle();installClawdRigStyle();
    ensureComposerClawd();renderClawdTracks();
    clawdRhythm=installClawdRhythm({doc:hostDocument,win:hostWindow,button:composerClawd,enabled:clawdEnabled,reducedMotion:clawdPrefersReducedMotion});
    bind('mousemove',handleLook);bind('keydown',noteActivity);bind('visibilitychange',noteCcVisibility);
    for(const type of ['beforeinput','compositionstart','compositionend'])bind(type,handleClawdComposerEdit,true);
    bind('input',handleComposerInput,true);
    bind('focusin',focusChange,true);bind('focusout',focusChange,true);
    for(const type of ['wheel','pointerdown','pointermove','pointerup','pointercancel','keydown'])bind(type,readingIntent,true);
    hostWindow.addEventListener('resize',resize);
    clawdRuntimeTimer=hostWindow.setInterval(clawdRuntimeTick,200);
  } catch(error) {destroyRuntime();throw error;}
  return {
    begin(){if(destroyed||generationEventActive)return;generationEventActive=true;beginClawdGeneration();clawdOnMessageSent();},
    settle(outcome,arrived){if(destroyed)return;generationEventActive=false;settleClawdGeneration(outcome,arrived);},
    visible(on){hostDocument.body.style.visibility=on?'visible':'hidden';},
    readFrom(element){if(scrollHost===element)return;scrollHost?.removeEventListener('scroll',readingScroll);scrollHost=element;scrollHost?.addEventListener('scroll',readingScroll,{passive:true});clawdReadingGate.reset(true);},
    sync(){if(destroyed)return;clawdRhythm?.sync();syncClawdBState();},
    destroy:destroyRuntime
  };
}
