import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Search, 
  Hash, 
  ChevronRight,
  Info,
  BookOpen,
  Filter,
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Video,
  StopCircle,
  Play,
  Pause,
  Volume2,
  Trash2,
  Sun,
  Moon,
  X,
  Settings,
  Image,
  MoreHorizontal,
  CheckCheck,
  Flag
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface ForumPost {
  id: number;
  areaK: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  type: 'text' | 'video' | 'audio';
  mediaUrl?: string;
  timestamp: string;
  reactions?: { [emoji: string]: string[] }; // emoji -> list of userIds
  readBy?: string[]; // list of userNames
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '✅', '📚'];

const COMPETENCY_AREAS = [
  { id: 'K1', name: 'Critical Thinking & Problem Solving', description: 'Developing the ability to analyze, evaluate, and synthesize information to solve complex problems.' },
  { id: 'K2', name: 'Creativity & Innovation', description: 'Encouraging original thinking, imagination, and the ability to generate new ideas and solutions.' },
  { id: 'K3', name: 'Communication', description: 'Enhancing verbal, non-verbal, and written communication skills for effective interaction.' },
  { id: 'K4', name: 'Cooperation & Self-directed Learning', description: 'Promoting teamwork, collaboration, and the ability to take responsibility for one\'s own learning.' },
  { id: 'K5', name: 'ICT Proficiency', description: 'Developing digital literacy and the ability to use technology effectively for learning and work.' },
  { id: 'K6', name: 'Mathematical Literacy', description: 'Applying mathematical concepts and reasoning to solve real-world problems.' },
  { id: 'K7', name: 'Financial Literacy', description: 'Understanding financial concepts and making informed decisions about money management.' }
];

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceNote = ({ url, theme }: { url: string; theme: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Generate random heights for waveform
  const waveformBars = useMemo(() => {
    return [...Array(25)].map(() => 20 + Math.random() * 60);
  }, []);

  return (
    <div className="flex items-center gap-3 py-2 min-w-[240px]">
      <audio ref={audioRef} src={url} />
      <button 
        onClick={togglePlay}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm",
          theme === 'dark' ? "bg-emerald-500 text-white" : "bg-emerald-600 text-white"
        )}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
      </button>
      
      <div className="flex-1 flex items-center gap-[2px] h-8">
        {waveformBars.map((height, i) => {
          const isActive = progress > (i / 25) * 100;
          return (
            <div 
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-all duration-300",
                isActive 
                  ? (theme === 'dark' ? "bg-emerald-400" : "bg-emerald-600") 
                  : (theme === 'dark' ? "bg-white/20" : "bg-gray-300")
              )}
              style={{ 
                height: `${height}%`,
              }}
            />
          );
        })}
      </div>
      
      <span className="text-[10px] opacity-60 font-mono w-8 text-right">
        {duration ? formatTime(Math.floor(duration)) : '0:00'}
      </span>
    </div>
  );
};

const ForumMessage = React.memo(({ post, user, theme, onReaction, onLongPress }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col max-w-[85%] md:max-w-[70%] relative",
        post.senderId === user?.uid ? "ml-auto items-end" : "mr-auto items-start"
      )}
      onContextMenu={(e) => onLongPress(e, post)}
    >
      <div className={cn(
        "relative p-3 rounded-xl shadow-sm text-sm",
        post.senderId === user?.uid 
          ? (theme === 'dark' ? "bg-emerald-600 text-white rounded-tr-none" : "bg-[#dcf8c6] rounded-tr-none text-gray-800")
          : (theme === 'dark' ? "bg-white/10 text-white rounded-tl-none" : "bg-white rounded-tl-none text-gray-800")
      )}>
        {post.senderId !== user?.uid && (
          <p className="text-[10px] font-bold text-emerald-500 mb-1">{post.senderName}</p>
        )}
        
        {post.type === 'text' && (
          <p className="leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}

        {post.type === 'video' && post.mediaUrl && (
          <div className="rounded-lg overflow-hidden bg-black/5 mb-1">
            <video 
              src={post.mediaUrl} 
              controls 
              className="max-w-full max-h-[300px] w-full object-contain"
            />
          </div>
        )}

        {post.type === 'audio' && post.mediaUrl && (
          <VoiceNote url={post.mediaUrl} theme={theme} />
        )}
        
        {/* Reactions Display */}
        {post.reactions && Object.keys(post.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(post.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReaction(post.id, emoji)}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all",
                  (users as string[]).includes(user?.uid || '') 
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500" 
                    : (theme === 'dark' ? "bg-white/5 border-white/10 text-gray-400" : "bg-white border-gray-100 text-gray-600")
                )}
              >
                <span>{emoji}</span>
                <span>{(users as string[]).length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[9px] opacity-40 uppercase">
            {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {post.senderId === user?.uid && (
            <div className="flex -space-x-1">
              <span className="text-blue-400 text-[10px] font-bold">✓✓</span>
            </div>
          )}
        </div>
        {/* Bubble Tail */}
        <div className={cn(
          "absolute top-0 w-2 h-2",
          post.senderId === user?.uid 
            ? (theme === 'dark' ? "-right-2 bg-emerald-600 [clip-path:polygon(0_0,0_100%,100%_0)]" : "-right-2 bg-[#dcf8c6] [clip-path:polygon(0_0,0_100%,100%_0)]")
            : (theme === 'dark' ? "-left-2 bg-white/10 [clip-path:polygon(100%_0,100%_100%,0_0)]" : "-left-2 bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]")
        )} />
      </div>
    </motion.div>
  );
});

const Forums = () => {
  const { user } = useAuth();
  const [selectedArea, setSelectedArea] = useState(COMPETENCY_AREAS[0]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedMessageMenu, setSelectedMessageMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [onlineCount] = useState(Math.floor(Math.random() * 10) + 3);
  
  // Customization & Theming
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [chatBackground, setChatBackground] = useState<string>('bg-[#e5ddd5]');
  const [groupIcon, setGroupIcon] = useState<string>('Users');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [autoTheme, setAutoTheme] = useState(true);
  
  // Media Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setAudioBlob(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('Video file is too large. Please select a file under 50MB.');
      return;
    }

    try {
      setIsUploading(true);
      const { url } = await api.forums.uploadMedia(file);
      const post = await api.forums.createPost(selectedArea.id, '', 'video', url);
      setPosts([...posts, post]);
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video.');
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleAudioSend = async () => {
    if (!audioBlob) return;

    try {
      setIsUploading(true);
      const file = new File([audioBlob], 'voice-note.ogg', { type: 'audio/ogg' });
      const { url } = await api.forums.uploadMedia(file);
      const post = await api.forums.createPost(selectedArea.id, '', 'audio', url);
      setPosts([...posts, post]);
      setAudioBlob(null);
    } catch (error) {
      console.error('Error uploading voice note:', error);
      alert('Failed to upload voice note.');
    } finally {
      setIsUploading(false);
    }
  };

  const fetchPosts = useCallback(async (areaId: string, isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await api.forums.getPosts(areaId);
      
      setPosts(prev => {
        // Only update if data is actually different to prevent unnecessary re-renders
        if (JSON.stringify(data) === JSON.stringify(prev)) return prev;
        
        return data.map((p: any) => ({
          ...p,
          reactions: p.reactions || { '👍': [p.senderId === user?.uid ? 'other_user' : user?.uid].filter(Boolean) },
          readBy: p.readBy || ['Teacher Musoke', 'Student Namono', 'Director Kato']
        }));
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [user?.uid]);

  const handleReaction = useCallback((postId: number, emoji: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const reactions = { ...(p.reactions || {}) };
        const users = reactions[emoji] || [];
        if (users.includes(user?.uid || '')) {
          reactions[emoji] = users.filter(u => u !== user?.uid);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...users, user?.uid || ''];
        }
        return { ...p, reactions };
      }
      return p;
    }));
  }, [user?.uid]);

  const handleLongPress = useCallback((e: React.MouseEvent | React.TouchEvent, post: ForumPost) => {
    e.preventDefault();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const y = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setSelectedMessageMenu({ id: post.id, x, y });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSelectedMessageMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!autoTheme) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [autoTheme]);

  useEffect(() => {
    fetchPosts(selectedArea.id, true);
    const interval = setInterval(() => fetchPosts(selectedArea.id), 5000);
    return () => clearInterval(interval);
  }, [selectedArea.id, fetchPosts]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [posts]);

  useEffect(() => {
    // Cleanup: Stop all media when leaving the page
    return () => {
      const mediaElements = document.querySelectorAll('audio, video');
      mediaElements.forEach((el: any) => {
        el.pause();
        el.src = "";
        el.load();
      });
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      const post = await api.forums.createPost(selectedArea.id, newPost);
      setPosts([...posts, post]);
      setNewPost('');
    } catch (error) {
      console.error('Error sending post:', error);
    }
  };

  const filteredAreas = COMPETENCY_AREAS.filter(area => 
    area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return <Users size={24} />;
      case 'Shield': return <Hash size={24} />;
      case 'Zap': return <BookOpen size={24} />;
      case 'Star': return <Info size={24} />;
      case 'MessageSquare': return <MessageSquare size={24} />;
      case 'Flag': return <Flag size={24} />;
      case 'Smile': return <Smile size={24} />;
      case 'Settings': return <Settings size={24} />;
      default: return <Users size={24} />;
    }
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      theme === 'dark' ? "bg-[#0a0a0a] text-white" : "bg-gray-50 text-gray-900"
    )}>
      <div className="max-w-7xl mx-auto h-screen flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "w-full md:w-80 border-r flex flex-col",
          theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
        )}>
          <div className={cn(
            "p-6 border-b",
            theme === 'dark' ? "border-white/10" : "border-gray-100"
          )}>
            <div className="flex items-center justify-between mb-6">
              <h1 className={cn(
                "text-xl font-bold tracking-tight",
                theme === 'dark' ? "text-white" : "text-gray-900"
              )}>Area K Forums</h1>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    theme === 'dark' ? "bg-white/5 text-emerald-400" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <Link to="/dashboard" className={cn(
                  "p-2 rounded-xl transition-all",
                  theme === 'dark' ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                )}>
                  <ArrowLeft size={20} />
                </Link>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search competencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none transition-all border",
                  theme === 'dark' 
                    ? "bg-white/5 border-white/10 focus:border-emerald-500/50 text-white" 
                    : "bg-gray-50 border-gray-100 focus:border-emerald-500 text-gray-900"
                )}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {filteredAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => {
                  setSelectedArea(area);
                  setIsChatOpen(true);
                }}
                className={cn(
                  "w-full p-3 rounded-2xl flex items-center gap-3 transition-all group relative overflow-hidden",
                  selectedArea.id === area.id 
                    ? (theme === 'dark' ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                    : (theme === 'dark' ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-50 text-gray-600")
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                  selectedArea.id === area.id ? "bg-emerald-600 text-white" : (theme === 'dark' ? "bg-white/5" : "bg-gray-100")
                )}>
                  {area.id}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className={cn(
                      "font-bold truncate",
                      theme === 'dark' ? "text-white" : "text-gray-900"
                    )}>{area.name}</div>
                  </div>
                  <div className="text-[10px] opacity-60 truncate flex items-center gap-1">
                    <span className="text-emerald-500 font-medium">NCDC:</span> {area.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col relative transition-all duration-300",
          isChatOpen 
            ? "fixed inset-0 z-[100] lg:relative lg:z-0 flex" 
            : "hidden lg:flex",
          theme === 'dark' ? "bg-[#0a0a0a]" : "bg-[#e5ddd5]"
        )}>
          {/* Background Pattern */}
          <div 
            className={cn(
              "absolute inset-0 pointer-events-none z-0",
              theme === 'dark' ? "opacity-[0.03]" : "opacity-[0.06]"
            )}
            style={{ 
              backgroundImage: chatBackground.startsWith('bg-') ? 'url("https://www.transparenttextures.com/patterns/cubes.png")' : `url(${chatBackground})`,
              backgroundColor: chatBackground.startsWith('bg-') ? (theme === 'dark' ? '#0a0a0a' : '#e5ddd5') : 'transparent',
              backgroundSize: chatBackground.startsWith('bg-') ? 'auto' : 'cover',
              backgroundPosition: 'center'
            }} 
          />

          {/* Header */}
          <div className={cn(
            "px-4 py-3 border-b flex items-center justify-between z-10",
            theme === 'dark' ? "bg-[#111] border-white/10" : "bg-[#ededed] border-gray-200"
          )}>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsChatOpen(false)}
                className={cn(
                  "lg:hidden p-1 -ml-1 rounded-full transition-colors",
                  theme === 'dark' ? "text-gray-400 hover:bg-white/5" : "text-gray-600 hover:bg-gray-200"
                )}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {getGroupIcon(groupIcon)}
              </div>
              <div className="min-w-0">
                <h1 className={cn(
                  "text-base font-bold truncate max-w-[150px] md:max-w-xs",
                  theme === 'dark' ? "text-white" : "text-gray-900"
                )}>{selectedArea.name}</h1>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">{onlineCount} people online</p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-5",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              <Search className="w-5 h-5 cursor-pointer hover:text-emerald-500 transition-colors" />
              <Settings className="w-5 h-5 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => setShowCustomizer(true)} />
              <Info className="w-5 h-5 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => setShowGroupInfo(!showGroupInfo)} />
              <MoreVertical className="w-5 h-5 cursor-pointer hover:text-emerald-500 transition-colors" />
            </div>
          </div>

          {/* Group Info Sidebar (Overlay) */}
          <AnimatePresence>
            {showGroupInfo && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className={cn(
                  "absolute right-0 top-0 bottom-0 w-full md:w-80 z-[60] shadow-2xl border-l flex flex-col",
                  theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
                )}
              >
                <div className={cn(
                  "p-4 border-b flex items-center justify-between",
                  theme === 'dark' ? "bg-[#1a1a1a] border-white/10" : "bg-[#ededed] border-gray-200"
                )}>
                  <h3 className="font-bold">Group Info</h3>
                  <button onClick={() => setShowGroupInfo(false)} className="p-1 hover:bg-black/5 rounded-full">
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {selectedArea.id}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedArea.name}</h2>
                      <p className="text-sm opacity-60">Group · {onlineCount + 42} members</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Description</h4>
                    <p className="text-sm opacity-80 leading-relaxed">{selectedArea.description}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Customizer Modal */}
          <AnimatePresence>
            {showCustomizer && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden",
                    theme === 'dark' ? "bg-[#111] text-white" : "bg-white text-gray-900"
                  )}
                >
                  <div className="p-8 border-b border-inherit flex items-center justify-between">
                    <h3 className="text-xl font-bold">Customize Chat</h3>
                    <button onClick={() => setShowCustomizer(false)} className="text-gray-400 hover:text-inherit">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Theme Selection */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Theme Mode</label>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-black/5">
                        <span className="text-sm font-medium">Auto-Theming (Device State)</span>
                        <button 
                          onClick={() => setAutoTheme(!autoTheme)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            autoTheme ? "bg-emerald-500" : "bg-gray-400"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            autoTheme ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                      {!autoTheme && (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setTheme('light')}
                            className={cn(
                              "p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                              theme === 'light' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-transparent bg-black/5"
                            )}
                          >
                            <Sun size={16} /> Light
                          </button>
                          <button
                            onClick={() => setTheme('dark')}
                            className={cn(
                              "p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                              theme === 'dark' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-transparent bg-black/5"
                            )}
                          >
                            <Moon size={16} /> Dark
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Background Selection */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Chat Background</label>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          'bg-[#e5ddd5]', 
                          'bg-emerald-50/30', 
                          'bg-blue-50/30', 
                          'bg-amber-50/30',
                          'bg-rose-50/30',
                          'bg-indigo-50/30',
                          'bg-slate-900',
                          'bg-emerald-900'
                        ].map((bg) => (
                          <button
                            key={bg}
                            onClick={() => setChatBackground(bg)}
                            className={cn(
                              "h-12 rounded-xl border-2 transition-all",
                              bg,
                              chatBackground === bg ? "border-emerald-500" : "border-transparent"
                            )}
                          />
                        ))}
                        <button
                          onClick={() => {
                            const url = prompt("Enter image URL:");
                            if (url) setChatBackground(url);
                          }}
                          className={cn(
                            "h-12 rounded-xl border-2 border-dashed flex items-center justify-center",
                            theme === 'dark' ? "border-white/10" : "border-gray-200"
                          )}
                        >
                          <Image size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Group Icon Selection */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Group Icon</label>
                      <div className="grid grid-cols-4 gap-3">
                        {['Users', 'Shield', 'Zap', 'Star', 'MessageSquare', 'Flag', 'Smile', 'Settings'].map((icon) => (
                          <button
                            key={icon}
                            onClick={() => setGroupIcon(icon)}
                            className={cn(
                              "h-12 rounded-xl border-2 flex items-center justify-center transition-all",
                              theme === 'dark' ? "bg-white/5" : "bg-gray-50",
                              groupIcon === icon ? "border-emerald-500 text-emerald-500" : "border-transparent text-gray-400"
                            )}
                          >
                            {getGroupIcon(icon)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-8 bg-inherit border-t border-inherit">
                    <button
                      onClick={() => setShowCustomizer(false)}
                      className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
                    >
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 z-10 scrollbar-hide"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                <div className={cn(
                  "backdrop-blur-sm p-4 rounded-xl shadow-sm border",
                  theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white/80 border-black/5"
                )}>
                  <p className="text-emerald-500 text-[10px] uppercase tracking-widest font-bold mb-2">End-to-End Encrypted</p>
                  <p className="text-sm opacity-70">
                    Messages in this forum are visible to all verified educators in your region. 
                    Start the conversation about {selectedArea.name}.
                  </p>
                </div>
              </div>
            ) : (
              posts.map((post) => (
                <ForumMessage 
                  key={post.id} 
                  post={post} 
                  user={user} 
                  theme={theme} 
                  onReaction={handleReaction} 
                  onLongPress={handleLongPress} 
                />
              ))
            )}
          </div>

          {/* Input */}
          <div className={cn(
            "p-2 md:p-4 flex flex-col gap-2 z-10",
            theme === 'dark' ? "bg-[#111]" : "bg-[#f0f2f5]"
          )}>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={cn(
                    "p-3 rounded-xl shadow-xl border flex flex-wrap gap-2 mb-2",
                    theme === 'dark' ? "bg-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
                  )}
                >
                  {EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setNewPost(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-xl hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-gray-400 px-2">
                <Smile 
                  className={cn("w-6 h-6 cursor-pointer transition-colors", showEmojiPicker && "text-emerald-500")} 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                />
                <div className="relative">
                  <Paperclip className="w-6 h-6 cursor-pointer hover:text-emerald-500 transition-colors" />
                  <input 
                    type="file" 
                    ref={videoInputRef}
                    accept="video/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleVideoSelect}
                  />
                </div>
              </div>
              
              {isRecording ? (
                <div className={cn(
                  "flex-1 flex items-center gap-3 rounded-full px-4 py-2 shadow-sm",
                  theme === 'dark' ? "bg-white/5" : "bg-white"
                )}>
                  <div className="flex items-center gap-2 text-red-500 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm font-bold">{formatTime(recordingTime)}</span>
                  </div>
                  <div className="flex-1 text-gray-400 text-sm">Recording...</div>
                  <button onClick={cancelRecording} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button onClick={stopRecording} className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <StopCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : audioBlob ? (
                <div className={cn(
                  "flex-1 flex items-center gap-3 rounded-full px-4 py-2 shadow-sm",
                  theme === 'dark' ? "bg-white/5" : "bg-white"
                )}>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 opacity-60 text-sm">Voice note ready</div>
                  <button onClick={() => setAudioBlob(null)} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleAudioSend}
                    disabled={isUploading}
                    className="px-4 py-1 bg-emerald-600 text-white rounded-full text-sm font-bold disabled:opacity-50"
                  >
                    {isUploading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Type a message"
                    className={cn(
                      "flex-1 px-4 py-2.5 border-none rounded-full text-sm focus:outline-none shadow-sm",
                      theme === 'dark' ? "bg-white/5 text-white" : "bg-white text-gray-900"
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  {!newPost.trim() ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-11 h-11 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700 transition-all shadow-md shrink-0"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!newPost.trim() || isUploading}
                      className="w-11 h-11 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shrink-0"
                    >
                      <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Long Press / Context Menu */}
          <AnimatePresence>
            {selectedMessageMenu && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ 
                  position: 'fixed', 
                  left: Math.min(selectedMessageMenu.x, window.innerWidth - 200), 
                  top: Math.min(selectedMessageMenu.y, window.innerHeight - 250),
                  zIndex: 1000 
                }}
                className={cn(
                  "rounded-2xl shadow-2xl border py-2 w-48 overflow-hidden",
                  theme === 'dark' ? "bg-[#1a1a1a] border-white/10" : "bg-white border-gray-100"
                )}
              >
                <div className="px-4 py-2 border-b border-inherit">
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Message Options</p>
                </div>
                <button 
                  className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-3"
                  onClick={() => {
                    const post = posts.find(p => p.id === selectedMessageMenu.id);
                    if (post) {
                      window.location.href = `/messages?user=${post.senderId}`;
                    }
                    setSelectedMessageMenu(null);
                  }}
                >
                  <MessageSquare size={16} className="text-emerald-500 group-hover:text-white" />
                  Inbox Sender
                </button>
                <div className="px-4 py-2 border-t border-inherit">
                  <p className="text-[9px] opacity-40 mb-2">Read by:</p>
                  <div className="space-y-1">
                    {posts.find(p => p.id === selectedMessageMenu.id)?.readBy?.map(name => (
                      <div key={name} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-[10px] opacity-70">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-2 flex justify-between border-t border-inherit">
                  {EMOJIS.slice(0, 5).map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => {
                        handleReaction(selectedMessageMenu.id, emoji);
                        setSelectedMessageMenu(null);
                      }}
                      className="text-lg hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Forums;
