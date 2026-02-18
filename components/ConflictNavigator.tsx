
import { ENV } from '../lib/config';
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Type, FunctionDeclaration } from '@google/genai';
import { UserData } from '../types';
import { generateMediationDebrief } from '../services/geminiService';
import { sensoryService } from '../services/sensoryService';
import Markdown from 'markdown-to-jsx';

interface ConflictNavigatorProps {
  userData: UserData | null;
  onClose: () => void;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const ConflictNavigator: React.FC<ConflictNavigatorProps> = ({ userData, onClose }) => {
  const [isPreflight, setIsPreflight] = useState(true);
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [phase, setPhase] = useState<'grounding' | 'mediation' | 'intervention'>('grounding');
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [stability, setStability] = useState(1); 
  const [volume, setVolume] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [debrief, setDebrief] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const audioContexts = useRef<{ input?: AudioContext, output?: AudioContext }>({});
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const ambientMusicRef = useRef<{ nodes: any[], ctx: AudioContext | null }>({ nodes: [], ctx: null });
  const fullTranscriptRef = useRef<string>('');

  const setMediationState: FunctionDeclaration = {
    name: 'setMediationState',
    parameters: {
      type: Type.OBJECT,
      description: 'Updates the UI with the current mediation phase and emotional metrics.',
      properties: {
        newPhase: { 
          type: Type.STRING, 
          enum: ['grounding', 'mediation', 'intervention'],
          description: 'The current stage of the conflict resolution.' 
        },
        speakerName: { 
          type: Type.STRING,
          description: 'The name of the partner who currently has the floor.' 
        },
        tensionLevel: { 
          type: Type.NUMBER,
          description: 'A scale from 0 (calm) to 1 (high friction/interruption).'
        }
      },
      required: ['newPhase']
    },
  };

  const startAmbientMusic = (ctx: AudioContext) => {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 5);
    masterGain.connect(ctx.destination);

    const freqs = [110, 164.81, 220, 277.18]; 
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.value = 0.03 / freqs.length;
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      ambientMusicRef.current.nodes.push(osc, g);
    });
    ambientMusicRef.current.nodes.push(masterGain);
  };

  const stopAmbientMusic = () => {
    ambientMusicRef.current.nodes.forEach(n => {
      try { n.stop(); } catch(e) {}
      try { n.disconnect(); } catch(e) {}
    });
    ambientMusicRef.current.nodes = [];
  };

  const initiatePreflight = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {
      setMicPermission('denied');
    }
  };

  const handleEndSession = async () => {
    if (isSummarizing) return;
    sensoryService.tap();
    setIsSummarizing(true);
    
    if (sessionPromiseRef.current) {
        const session = await sessionPromiseRef.current;
        session.close();
    }
    stopAmbientMusic();

    if (fullTranscriptRef.current.trim()) {
        try {
            const debriefResult = await generateMediationDebrief(fullTranscriptRef.current);
            setDebrief(debriefResult.data || debriefResult.error || "The dialogue has ended in peace.");
            sensoryService.success();
        } catch (err) {
            console.error("Debrief generation failed", err);
            onClose();
        } finally {
            setIsSummarizing(false);
        }
    } else {
        onClose();
    }
  };

  const startMediation = async () => {
    if (!ENV.API_KEY || isInitializing) return;
    
    sensoryService.tap();
    setIsInitializing(true);
    setIsPreflight(false);

    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContexts.current = { input: inputCtx, output: outputCtx };
    
    startAmbientMusic(outputCtx);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ai = new GoogleGenAI({ apiKey: ENV.API_KEY });

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = inputCtx.createMediaStreamSource(stream);
          const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
            const vol = Math.sqrt(sum / inputData.length);
            setVolume(vol);

            const pcmBlob: Blob = { 
                data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)), 
                mimeType: 'audio/pcm;rate=16000' 
            };
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'setMediationState') {
                const { newPhase, speakerName, tensionLevel } = fc.args as any;
                if (newPhase) {
                  if (newPhase === 'intervention') sensoryService.alert();
                  else if (newPhase === 'mediation') sensoryService.tap();
                  setPhase(newPhase);
                }
                if (speakerName !== undefined) {
                   if (speakerName !== activeSpeaker && speakerName !== null) {
                     sensoryService.tap();
                   }
                   setActiveSpeaker(speakerName);
                }
                if (tensionLevel !== undefined) {
                  if (tensionLevel > 0.8 && stability > 0.2) {
                    sensoryService.shiver(); // High tension shiver
                  }
                  setStability(1 - tensionLevel);
                }
                
                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: 'ok' } }
                }));
              }
            }
          }

          if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              fullTranscriptRef.current += ' ' + text;
              setTranscription(t => (t + ' ' + text).slice(-150));
          }

          if (message.serverContent?.inputTranscription) {
              fullTranscriptRef.current += ' ' + message.serverContent.inputTranscription.text;
          }

          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            const rawBytes = decode(base64Audio);
            const chunkDuration = (rawBytes.byteLength / 2) / 24000;
            const startTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            nextStartTimeRef.current = startTime + chunkDuration;

            const audioBuffer = await decodeAudioData(rawBytes, outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            
            source.addEventListener('ended', () => {
              sourcesRef.current.delete(source);
            });

            source.start(startTime);
            sourcesRef.current.add(source);
          }

          if (message.serverContent?.interrupted) {
            for (const s of sourcesRef.current) {
              try { s.stop(); } catch (e) {}
            }
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => console.error("Session error:", e),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        tools: [{ functionDeclarations: [setMediationState] }],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        systemInstruction: `You are Kindred, a master conflict mediator. You are facilitating a safe dialogue between ${userData?.userName} and ${userData?.partnerName}.`,
      }
    });
    sessionPromiseRef.current = sessionPromise;
  };

  useEffect(() => { 
    initiatePreflight();
    return () => { 
        if (sessionPromiseRef.current) sessionPromiseRef.current.then(s => s.close()); 
        stopAmbientMusic();
    }; 
  }, []);

  const getStabilityColor = () => {
    if (phase === 'intervention') return 'var(--accent-pink)'; 
    if (stability > 0.8) return 'var(--accent-green)'; 
    if (stability > 0.4) return '#FFCC00'; 
    return '#FF4D4D'; 
  };

  if (debrief) {
    return (
      <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8 animate-fade-in text-center overflow-y-auto">
        <header className="mb-12 mt-12">
            <h2 className="text-clamp-6xl font-light mb-4 text-[var(--text-primary)]">Alchemy.</h2>
            <p className="text-xs font-bold uppercase tracking-[0.4em] opacity-30 heading-font">Resolution Debrief Created</p>
        </header>
        <div className="max-w-xl w-full p-10 bg-current/2 border border-current border-opacity-5 rounded-[3rem] text-left animate-fade-in-up mb-12">
             <div className="prose prose-stone dark:prose-invert prose-xl italic font-light leading-relaxed text-[var(--text-primary)]">
                <Markdown>{debrief}</Markdown>
             </div>
        </div>
        <button 
            onClick={() => {
              sensoryService.tap();
              onClose();
            }}
            className="w-full max-w-sm py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-xs tracking-[0.3em] shadow-2xl transition-all heading-font mb-20"
        >
            Internalize & Close
        </button>
      </div>
    );
  }

  if (isSummarizing) {
    return (
      <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8 animate-fade-in text-center">
        <div className="w-16 h-16 border-2 border-current border-opacity-5 border-t-inherit rounded-full animate-spin mb-12" />
        <h2 className="text-clamp-5xl font-light mb-4 text-[var(--text-primary)]">Calibrating Resonance...</h2>
        <p className="text-xs font-bold uppercase tracking-[0.4em] opacity-30 heading-font">The Oracle is synthesizing your dialogue</p>
      </div>
    );
  }

  if (isPreflight) {
    return (
      <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8 animate-fade-in text-center">
        <h2 className="text-clamp-6xl font-light mb-8 text-[var(--text-primary)]">Threshold.</h2>
        <div className="max-w-xs space-y-8 w-full">
            <p className="text-2xl text-[var(--text-primary)] opacity-60 italic font-light leading-relaxed">
                Before we enter the architecture of conflict, we must ensure your environment is grounded.
            </p>
            
            <div className="space-y-6 pt-8">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest heading-font px-4">
                    <span className="opacity-30">Mic Permission</span>
                    <span className={micPermission === 'granted' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-pink)]'}>
                        {micPermission === 'granted' ? 'Ready' : 'Pending'}
                    </span>
                </div>
                <div className="w-full h-[1px] bg-current opacity-10" />
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest heading-font px-4">
                    <span className="opacity-30">Oracle Sync</span>
                    <span className="text-[var(--accent-green)]">Calibrated</span>
                </div>
            </div>

            <button 
                onClick={startMediation}
                disabled={micPermission !== 'granted'}
                className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-xs tracking-[0.3em] shadow-2xl disabled:opacity-10 transition-all mt-12 heading-font"
            >
                Initiate Safe Space
            </button>
            <button onClick={onClose} className="text-xs font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-colors py-4">Return to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 animate-fade-in overflow-hidden">
      <div 
        className="absolute inset-0 opacity-5 transition-colors duration-[3000ms]"
        style={{ backgroundColor: getStabilityColor() }}
      />

      <div className="text-center w-full max-lg z-10">
        {phase !== 'grounding' && (
          <header className="mb-16 animate-fade-in">
            <h2 className="text-clamp-5xl font-light mb-4 text-[var(--text-primary)]">
              {phase === 'mediation' ? 'The Floor.' : 'Pause.'}
            </h2>
            <p className="text-xs font-bold uppercase tracking-[0.4em] opacity-30 heading-font">
                {phase === 'mediation' ? (activeSpeaker ? `${activeSpeaker}'s Turn` : 'Dialogue') : 'Rising Tension'}
            </p>
          </header>
        )}
        
        <div className="relative h-72 flex items-center justify-center mb-12">
            <div 
                className="w-32 h-32 rounded-full blur-3xl transition-all duration-1000" 
                style={{
                    backgroundColor: getStabilityColor(),
                    transform: `scale(${1 + (volume * 15) + (1 - stability) * 1.5})`, 
                    opacity: 0.15 + (volume * 1.5)
                }} 
            />
            
            <div 
                className={`w-40 h-40 rounded-full border border-current border-opacity-5 flex items-center justify-center transition-all duration-[3000ms] ${phase === 'grounding' ? 'animate-[pulse_8s_infinite] scale-[1.8] border-opacity-10' : ''}`}
                style={{ borderColor: getStabilityColor() }}
            >
               {activeSpeaker && phase !== 'grounding' && (
                 <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font animate-fade-in">
                   {activeSpeaker}
                 </span>
               )}
               {phase === 'grounding' && (
                 <span className="text-xs font-bold uppercase tracking-[0.4em] text-[var(--accent-green)] opacity-50 heading-font">Grounding</span>
               )}
            </div>

            {stability < 0.7 && phase !== 'grounding' && (
                <div className="absolute top-0 text-xs font-bold uppercase tracking-widest text-orange-400 opacity-60 animate-pulse">
                  Unstable Energy
                </div>
            )}
        </div>

        {phase !== 'grounding' && (
          <div className="mb-24 px-8 min-h-[5rem] animate-fade-in">
              <p className="text-2xl leading-relaxed opacity-80 italic text-center font-light">
                  {transcription || "Safe space established."}
              </p>
          </div>
        )}

        <div className="flex flex-col items-center gap-6">
            <button 
                onClick={handleEndSession} 
                className={`text-xs font-bold uppercase tracking-widest transition-all heading-font ${phase === 'grounding' ? 'opacity-10 hover:opacity-30 mt-20' : 'opacity-30 hover:opacity-100 border-b border-transparent hover:border-current pb-2'}`}
            >
                Dissolve Session
            </button>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.1; box-shadow: 0 0 0px rgba(168,255,181,0); }
            50% { transform: scale(1.3); opacity: 0.25; box-shadow: 0 0 60px rgba(168,255,181,0.1); filter: blur(10px); }
            100% { transform: scale(1); opacity: 0.1; box-shadow: 0 0 0px rgba(168,255,181,0); }
        }
      `}</style>
    </div>
  );
};

export default ConflictNavigator;
