
import React, { useState, useRef } from 'react';
import { interpretSynchronicity } from '../services/geminiService';
import Markdown from 'react-markdown';

const EsotericLens: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setInterpretation(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInterpret = async () => {
    if (!image) return;
    setIsLoading(true);
    try {
      const base64Data = image.split(',')[1];
      const result = await interpretSynchronicity(base64Data);
      setInterpretation(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setInterpretation(null);
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-current">
      <header className="mb-16">
        <h1 className="text-clamp-6xl font-light mb-2">Lens.</h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font">Kindred Oracle Vision</p>
      </header>

      {!image ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-current/10 rounded-[3rem] space-y-8">
          <p className="text-xl italic font-light opacity-60 text-center px-10">Capture a fragment of your shared world to find its hidden resonance.</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-12 py-5 bg-current text-current-inverted rounded-full font-bold uppercase text-xs tracking-[0.3em] shadow-xl active:scale-95 transition-all"
          >
            Capture Light
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      ) : (
        <div className="space-y-12 animate-fade-in">
          <div className="relative group overflow-hidden rounded-[3rem] border border-current/10 shadow-2xl">
            <img src={image} alt="Captured light" className="w-full h-auto object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-1000" />
            {isLoading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-white animate-pulse">Consulting the Oracle</span>
              </div>
            )}
          </div>

          {!interpretation && !isLoading && (
            <button 
              onClick={handleInterpret}
              className="w-full py-6 border border-current/20 rounded-full font-bold uppercase text-xs tracking-[0.4em] hover:bg-current hover:text-current-inverted transition-all"
            >
              Seek Interpretation
            </button>
          )}

          {interpretation && (
            <div className="p-10 bg-current/2 border border-current/5 rounded-[3rem] animate-fade-in-up">
              <span className="text-xs font-bold uppercase tracking-widest opacity-30 mb-6 block heading-font">Oracle Synthesis</span>
              <div className="prose prose-stone dark:prose-invert prose-xl italic font-light leading-relaxed">
                <Markdown>{interpretation}</Markdown>
              </div>
              <button 
                onClick={reset}
                className="mt-12 text-xs font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity border-b border-current pb-1"
              >
                Clear Vision
              </button>
            </div>
          )}
        </div>
      )}
      <style>{`.text-current-inverted { color: var(--midnight); }`}</style>
    </div>
  );
};

export default EsotericLens;
