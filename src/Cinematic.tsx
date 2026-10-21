// Opening cinematic (#19): Chet's approved video, packaged in the APK as a native asset (not in the game
// bundle), shown full screen when the app opens, before the title and character select. The game asks for it
// (never when a drive is being resumed). It ends by itself: onEnd('finished') at the end, 'skipped' on a tap,
// 'error' if it can't play. If the game stops it (cinematic.stop), onEnd is not called.
// Its sound mixes with other audio instead of pausing it.
import React, {useEffect, useRef} from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {useVideoPlayer, VideoView} from 'expo-video';

export const OPENING_VIDEO = require('../assets/video/mole-beyond-opening.mp4');
// Longer than the ~28 s video: if the player never reports the end, the launch still finishes.
export const CINEMATIC_MAX_MS = 40000;

export type CinematicOutcome = 'finished' | 'skipped' | 'error';
export function Cinematic({onEnd}: {onEnd: (outcome: CinematicOutcome) => void}) {
  const ended = useRef(false);
  const end = (outcome: CinematicOutcome) => { if (ended.current) return; ended.current = true; onEnd(outcome); };
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
  return <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Skip opening cinematic" onPress={() => end('skipped')}>
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} pointerEvents="none" />
  </Pressable>;
}
