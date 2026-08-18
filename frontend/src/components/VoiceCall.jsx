import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

export default function VoiceCall({ target, socketRef, onEnd, incoming = null }) {
  const [status, setStatus] = useState(incoming ? 'incoming' : 'calling');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pcRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current || !target) return;
    const socket = socketRef.current;
    
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('call:ice', { to: target.id, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
    };

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:initiate', { to: target.id, offer });
        setStatus('calling');
      } catch { setStatus('error'); }
    };

    const answerCall = async () => {
      if (!incoming?.offer) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:answer', { to: incoming.from, answer });
        setStatus('connected');
        timerRef.current = setInterval(() => setDuration(p => p + 1), 1000);
      } catch { setStatus('error'); }
    };

    if (incoming) answerCall();
    else startCall();

    socket.on('call:answered', async ({ answer }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      setStatus('connected');
      timerRef.current = setInterval(() => setDuration(p => p + 1), 1000);
    });
    socket.on('call:ice', async ({ candidate }) => {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });
    socket.on('call:ended', () => endCall());

    return () => {
      socket.off('call:answered');
      socket.off('call:ice');
      socket.off('call:ended');
    };
  }, [target, socketRef, incoming]);

  const endCall = () => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    if (pcRef.current) pcRef.current.close();
    if (timerRef.current) clearInterval(timerRef.current);
    if (onEnd) onEnd();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setMuted(!muted); }
    }
  };

  const formatDuration = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="voice-call-overlay">
      <div className="voice-call-container">
        <div className="call-background">
          <div className="call-pulse"></div>
          <div className="call-pulse delay-1"></div>
          <div className="call-pulse delay-2"></div>
        </div>
        <div className="call-info">
          <div className="call-avatar-large">
            {target?.avatar ? <img src={target.avatar} alt="avatar" /> : <Icon name="User" size={64} />}
          </div>
          <h2 className="call-username">{target?.username || 'Unknown'}</h2>
          <p className="call-status">
            {status === 'calling' && 'جاري الاتصال...'}
            {status === 'incoming' && 'مكالمة واردة...'}
            {status === 'connected' && formatDuration(duration)}
            {status === 'error' && 'فشل الاتصال'}
          </p>
        </div>
        <div className="call-controls">
          {status === 'connected' && (
            <button className={`call-control-btn ${muted ? 'active' : ''}`} onClick={toggleMute}>
              <Icon name={muted ? 'MicOff' : 'Mic'} size={24} />
            </button>
          )}
          <button className="call-control-btn end-call-btn" onClick={endCall}>
            <Icon name="PhoneOff" size={28} />
          </button>
        </div>
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  );
}