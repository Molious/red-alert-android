// Opening cinematic (#19): Chet's approved video, packaged in the APK as a native asset (not in the game
// bundle), shown full screen over the cockpit at launch. The game decides when it starts and stops:
// - it ends by itself: onEnd('finished') when the video plays to the end, or onEnd('error') if it can't play;
// - the game stops it the moment the car moves (cinematic.stop); then onEnd is NOT called.
// Its sound mixes with the crew and directions instead of pausing them.
import React, {useEffect, useRef} from 'react';
import {StyleSheet} from 'react-native';
import {useVideoPlayer, VideoView} from 'expo-video';

export const OPENING_VIDEO = require('../assets/video/mole-beyond-opening.mp4');
// Longer than the ~28 s video: if the player never reports the end, the launch still finishes.
export const CINEMATIC_MAX_MS = 40000;

export function Cinematic({onEnd}: {onEnd: (outcome: 'finished' | 'error') => void}) {
  const ended = useRef(false);
  const end = (outcome: 'finished' | 'error') => { if (ended.current) return; ended.current = true; onEnd(outcome); };
  const player = useVideoPlayer(OPENING_VIDEO, p => {
    p.loop = false;
    p.audioMixingMode = 'mixWithOthers';
    p.staysActiveInBackground = false;
    p.showNowPlayingNotification = false;
    p.play();
  });
  useEffect(() => {
    const done = player.addListener('playToEnd', () => end('finished'));
    const status = player.addListener('statusChange', e => { if (e.status === 'error') end('error'); });
    const limit = setTimeout(() => end('finished'), CINEMATIC_MAX_MS);
    return () => { done.remove(); status.remove(); clearTimeout(limit); };
  }, [player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />;
}
