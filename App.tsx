
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChristmasTree from './components/ChristmasTree';
import PhotoWall from './components/PhotoWall';
import { jingleBells } from './services/audioSynthesizer';
import { DanmakuMessage, UserPhoto } from './types';

const PRESET_MESSAGES = [
  "🎄 圣诞快乐！Merry Christmas!",
  "🎁 愿你在这个冬日收获满满的幸福~",
  "❄️ 叮叮当，叮叮当，铃儿响叮当~",
  "⭐ 所有的愿望都在这个夜晚实现！",
  "🎅 记得把袜子挂在床头哦",
  "🎊 2025 新年快乐 & 圣诞快乐!",
  "🧣 祝大家冬日温暖，平安喜乐",
  "🍎 吃个平安果，一年平平安安"
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<DanmakuMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const nextId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMessage = useCallback((text: string) => {
    const newMessage: DanmakuMessage = {
      id: `msg-${Date.now()}-${nextId.current++}`,
      text,
      color: `hsl(190, 100%, 85%)`,
      top: 15 + Math.random() * 60,
      duration: 10 + Math.random() * 8,
      fontSize: 20 + Math.random() * 8
    };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }, newMessage.duration * 1000);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isGalleryOpen) {
        const randomMsg = PRESET_MESSAGES[Math.floor(Math.random() * PRESET_MESSAGES.length)];
        addMessage(randomMsg);
      }
    }, 2800);
    return () => clearInterval(interval);
  }, [addMessage, isGalleryOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      addMessage(inputText);
      setInputText("");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Fix: Explicitly handle the FileList to ensure each 'file' is typed as a File/Blob
    const fileArray: File[] = Array.from(files).slice(0, 9);
    fileArray.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => {
            if (prev.length >= 9) return prev;
            return [...prev, { id: `photo-${Date.now()}-${Math.random()}`, url: event.target!.result as string }];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="relative w-full h-full bg-[#000411] overflow-hidden select-none font-sans">
      <ChristmasTree 
        photos={photos} 
        onDoubleClick={() => photos.length > 0 && setIsGalleryOpen(true)} 
        shattered={isGalleryOpen} 
      />

      {isGalleryOpen && (
        <PhotoWall photos={photos} onClose={() => setIsGalleryOpen(false)} />
      )}

      {/* 主标题 - 仅在非画廊模式显示 */}
      <div className={`absolute top-1/2 right-[8%] transform -translate-y-1/2 z-10 pointer-events-none text-right flex flex-col items-end transition-all duration-1000 ${isGalleryOpen ? 'opacity-0 scale-90 blur-xl' : 'opacity-100 scale-100 blur-0'}`}>
        <h2 className="text-7xl sm:text-9xl font-serif italic text-[#00e1ff] drop-shadow-[0_0_25px_rgba(0,225,255,1)] leading-tight">
          Merry<br/>Christmas
        </h2>
        <p className="text-3xl sm:text-4xl font-black text-[#88ccff] tracking-[0.5em] mt-6 drop-shadow-[0_0_15px_rgba(136,204,255,0.7)]">
          圣诞快乐
        </p>
      </div>

      {/* 弹幕层 - 在聚合过程中也保持显示以增加动态感 */}
      <div className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-1000 ${isGalleryOpen ? 'opacity-0' : 'opacity-100'}`}>
        {messages.map(msg => (
          <div
            key={msg.id}
            className="danmaku-item"
            style={{
              top: `${msg.top}%`,
              color: msg.color,
              fontSize: `${msg.fontSize}px`,
              animationDuration: `${msg.duration}s`,
              textShadow: '0 0 10px rgba(0,225,255,0.8)'
            }}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* 交互控件 */}
      <div className={`absolute bottom-10 left-10 z-20 flex flex-col items-start gap-6 transition-all duration-1000 ${isGalleryOpen ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-cyan-900/30 hover:bg-cyan-500/40 backdrop-blur-2xl border border-cyan-500/40 text-cyan-200 rounded-lg transition-all flex items-center gap-2 text-sm font-bold tracking-widest shadow-xl"
          >
            📸 添加记忆照片 ({photos.length}/9)
          </button>
          <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} multiple accept="image/*" className="hidden" />
          
          {photos.length > 0 && (
            <button
              onClick={() => setIsGalleryOpen(true)}
              className="px-8 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-black rounded-lg transition-all shadow-[0_0_30px_rgba(34,211,238,0.7)] active:scale-95 text-sm uppercase"
            >
              🖼️ 开启记忆空间
            </button>
          )}

          <button
            onClick={() => { jingleBells.toggle(); setIsMusicPlaying(!isMusicPlaying); }}
            className={`px-6 py-2.5 rounded-lg border transition-all text-sm font-bold tracking-widest ${
              isMusicPlaying ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(8,145,178,0.6)]' : 'bg-white/5 border-white/10 text-cyan-500/60'
            }`}
          >
            {isMusicPlaying ? '🔊 音乐：开' : '🔇 音乐：关'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-black/50 backdrop-blur-3xl p-1.5 rounded-lg border border-cyan-500/30 w-full max-w-sm shadow-2xl">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="写下这一刻的祝愿..."
            className="flex-1 bg-transparent border-none outline-none text-cyan-50 px-4 placeholder-cyan-500/40 text-xs font-bold tracking-widest"
          />
          <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-2.5 rounded-lg transition-all active:scale-95 font-black text-xs">
            发送
          </button>
        </form>
      </div>

      {/* 饰边 branding */}
      <div className={`absolute top-10 left-10 z-20 pointer-events-none transition-opacity duration-1000 ${isGalleryOpen ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-16 h-1 bg-cyan-500 mb-3 shadow-[0_0_15px_rgba(6,182,212,1)]" />
        <h1 className="text-3xl font-black text-white/90 tracking-[0.6em] uppercase">
          X-MAS <span className="text-cyan-500">2025</span>
        </h1>
        <p className="text-cyan-500/40 text-[10px] mt-1 uppercase tracking-[0.5em] font-medium">
          粒子美学 • 2025 限定版
        </p>
      </div>

      {/* 屏幕光晕 */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-transparent to-cyan-900/5" />
      <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-cyan-900/10 to-transparent pointer-events-none" />
    </div>
  );
};

export default App;
