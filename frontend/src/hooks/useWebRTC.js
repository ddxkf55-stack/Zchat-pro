import { useRef, useState, useCallback } from 'react';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function useWebRTC(socketRef) {
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const [calling, setCalling] = useState(false);
  const [incoming, setIncoming] = useState(null);

  const createPC = useCallback((onIce) => {
    const pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = (e) => {
      if (e.candidate) onIce(e.candidate);
    };
    pcRef.current = pc;
    return pc;
  }, []);

  const startCall = useCallback(async (toUserId) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const pc = createPC((candidate) => {
      socketRef.current.emit('call:ice', { to: toUserId, candidate });
    });
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit('call:initiate', { to: toUserId, offer });
    setCalling(true);
  }, [createPC, socketRef]);

  const answerCall = useCallback(async (from, offer) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const pc = createPC((candidate) => {
      socketRef.current.emit('call:ice', { to: from, candidate });
    });
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.emit('call:answer', { to: from, answer });
    setCalling(true);
    setIncoming(null);
  }, [createPC, socketRef]);

  const endCall = useCallback((toUserId) => {
    if (pcRef.current) pcRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    pcRef.current = null;
    streamRef.current = null;
    setCalling(false);
    if (toUserId) socketRef.current.emit('call:end', { to: toUserId });
  }, [socketRef]);

  return { calling, incoming, setIncoming, startCall, answerCall, endCall, socketRef };
}