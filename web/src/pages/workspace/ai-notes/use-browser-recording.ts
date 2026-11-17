import { useEffect, useRef, useState } from 'react';

const formats = [
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
];

export function useBrowserRecording(onFile: (file: File) => void) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'recording' | 'finishing'>('idle');
  const [error, setError] = useState<string>();
  const mounted = useRef(false);
  const recorder = useRef<MediaRecorder>(null);
  const microphone = useRef<MediaStream>(null);
  const release = () => { microphone.current?.getTracks().forEach(track => track.stop()); microphone.current = null; };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      release();
    };
  }, []);
  const start = async () => {
    setError(undefined);
    const format = typeof MediaRecorder !== 'undefined' && formats.find(item => MediaRecorder.isTypeSupported(item.mime));
    if (!navigator.mediaDevices?.getUserMedia || !format) {
      setError('이 브라우저에서는 녹음할 수 없습니다. 음성 파일을 올려 주세요.');
      return;
    }
    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return; }
      microphone.current = stream;
      const current = new MediaRecorder(stream, { mimeType: format.mime });
      recorder.current = current;
      const chunks: Blob[] = [];
      let failed = false;
      current.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      current.onerror = () => {
        failed = true;
        if (mounted.current) setError('녹음을 저장하지 못했습니다. 다시 녹음해 주세요.');
      };
      current.onstop = () => {
        recorder.current = null;
        release();
        if (!mounted.current) return;
        setStatus('idle');
        if (failed) return;
        if (!chunks.length) { setError('녹음된 소리가 없습니다. 다시 녹음해 주세요.'); return; }
        onFile(new File(chunks, `녹음.${format.ext}`, { type: current.mimeType.split(';')[0] }));
      };
      current.start(1000);
      setStatus('recording');
    } catch {
      release();
      if (mounted.current) {
        setStatus('idle');
        setError('마이크를 열지 못했습니다. 브라우저 권한을 확인하거나 음성 파일을 올려 주세요.');
      }
    }
  };
  const stop = () => {
    if (recorder.current?.state === 'recording') { setStatus('finishing'); recorder.current.stop(); }
  };
  return { status, error, start, stop };
}
