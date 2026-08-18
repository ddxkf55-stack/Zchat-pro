import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

export default function VoiceRecorder({ onStop, onCancel }) {
  const [time, setTime] = useState(0);
  const recorderRef = useRef();
  const chunksRef = useRef([]);
  const timerRef = useRef();

  useEffect(() => {
    let mr;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        onStop(blob, time);
      };
      mr.start();
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    });
    return () => {
      clearInterval(timerRef.current);
      if (mr && mr.state === 'recording') mr.stop();
    };
  }, []);

  return (
    <div className="voice-recorder">
      <div className="recording-indicator">
        <div className="recording-dot"></div>
        <span className="recording-time">{Math.floor(time/60)}:{String(time%60).padStart(2,'0')}</span>
      </div>
      <div className="recording-actions">
        <button className="record-cancel-btn" onClick={onCancel}><Icon name="X" size={20} /></button>
        <button className="record-send-btn" onClick={() => recorderRef.current?.stop()}>
          <Icon name="Send" size={20} />
        </button>
      </div>
    </div>
  );
}