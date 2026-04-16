import { useState, useEffect } from 'react';

// UI Theme Palettes
const themes = {
  light: {
    bgMain: '#F5F5F5', bgChat: '#FFFFFF', headerBg: '#81D4FA', textHeader: '#FFFFFF',
    textMain: '#263238', textMuted: '#455A64', msgSelf: '#E1F5FE', msgOther: '#F5DEB3',
    inputBg: '#F0F0F0', inputText: '#000000', btnBg: '#81D4FA', btnText: '#FFFFFF',
    borderColor: '#EEEEEE', linkColor: '#0277BD', dropZoneBg: 'rgba(129, 212, 250, 0.4)'
  },
  dark: {
    bgMain: '#121212', bgChat: '#1E1E1E', headerBg: '#0277BD', textHeader: '#E0E0E0',
    textMain: '#E0E0E0', textMuted: '#B0BEC5', msgSelf: '#01579B', msgOther: '#3E2723',
    inputBg: '#2C2C2C', inputText: '#FFFFFF', btnBg: '#0288D1', btnText: '#FFFFFF',
    borderColor: '#333333', linkColor: '#81D4FA', dropZoneBg: 'rgba(2, 119, 189, 0.4)'
  }
};

// Markdown/Media Parser Engine: Detects URLs and renders corresponding DOM elements
const renderMessageText = (text, activeTheme) => {
  const urlRegex = /(https?:\/\/[^\s]+|\/uploads\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      
      // Feature: Image/GIF Rendering (including Tenor/Giphy support)
      const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(part) || part.includes('tenor.com') || part.includes('giphy.com');
      if (isImage) {
        return (
          <div key={index} style={{ marginTop: '8px', marginBottom: '4px' }}>
            <img 
              src={part} 
              alt="Attachment" 
              style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '12px', objectFit: 'cover' }} 
              // Fallback: If image fails to load, display raw URL
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
            />
            <a href={part} target="_blank" rel="noopener noreferrer" style={{ display: 'none', color: activeTheme.linkColor }}>Attachment</a>
          </div>
        );
      }

      // Feature: Native Video Player (.mp4, .webm)
      const isDirectVideo = /\.(mp4|webm|ogg|mov)$/i.test(part);
      if (isDirectVideo) {
        return (
          <div key={index} style={{ marginTop: '8px', marginBottom: '4px' }}>
            <video controls style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '12px', backgroundColor: '#000' }}>
              <source src={part} />Your browser does not support HTML5 video.
            </video>
          </div>
        );
      }

      // Feature: YouTube Iframe Embedding
      const ytMatch = part.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytMatch && ytMatch[1]) {
        return (
          <div key={index} style={{ marginTop: '8px', marginBottom: '4px' }}>
            <iframe width="100%" height="200" src={`https://www.youtube.com/embed/${ytMatch[1]}`} style={{ borderRadius: '12px', border: 'none' }} allowFullScreen></iframe>
          </div>
        );
      }

      // Default: Standard Hyperlink
      return <a key={index} href={part} target="_blank" rel="noopener noreferrer" style={{ color: activeTheme.linkColor, textDecoration: 'underline', wordBreak: 'break-word' }}>{part}</a>;
    }
    return <span key={index}>{part}</span>;
  });
};

function App() {
  // === PROFILE STATE MANAGEMENT ===
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState('');
  const [usernameTag, setUsernameTag] = useState('');
  
  // Hydrate profile from LocalStorage on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('sealfy_profile');
    if (savedProfile) {
      const { nick, tag } = JSON.parse(savedProfile);
      setNickname(nick);
      setUsernameTag(tag);
      setIsLoggedIn(true);
    }
  }, []);

  // Auth Handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (!nickname.trim() || !usernameTag.trim()) return;
    
    // Normalize username tag
    const formattedTag = usernameTag.startsWith('@') ? usernameTag : `@${usernameTag}`;
    setUsernameTag(formattedTag);
    
    localStorage.setItem('sealfy_profile', JSON.stringify({ nick: nickname, tag: formattedTag }));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('sealfy_profile');
    setIsLoggedIn(false);
    setNickname('');
    setUsernameTag('');
  };

  // === CORE CHAT LOGIC ===
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [themeMode, setThemeMode] = useState('system');
  const [isSystemDark, setIsSystemDark] = useState(false);
  
  // Drag & Drop specific states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // OS Theme Listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(mediaQuery.matches);
    const handler = (e) => setIsSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Polling Mechanism (MVP implementation - to be replaced by WebSockets)
  useEffect(() => {
    if (!isLoggedIn) return; 
    const fetchMessages = () => {
      fetch('/api/messages').then(res => res.json()).then(data => setMessages(data || [])).catch(console.error);
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Network Dispatcher for Messages
  const sendActualMessage = (msgText) => {
    const fullUsername = `${nickname} ${usernameTag}`;
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: fullUsername, text: msgText })
    });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendActualMessage(text);
    setText('');
  };

  // === DRAG & DROP HANDLERS (Intercepting Browser Defaults) ===
  const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e) => { preventDefaults(e); setIsDragging(true); };
  const handleDragOver = (e) => { preventDefaults(e); setIsDragging(true); };
  const handleDragLeave = (e) => { preventDefaults(e); if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); };
  
  const handleDrop = async (e) => {
    preventDefaults(e);
    setIsDragging(false);
    if (!isLoggedIn) return; 
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) sendActualMessage(data.url);
      } catch (err) { console.error('Upload failed:', err); } finally { setIsUploading(false); }
    }
  };

  const activeTheme = themeMode === 'system' ? (isSystemDark ? themes.dark : themes.light) : themes[themeMode];
  const fullUsername = `${nickname} ${usernameTag}`;

  // === RENDER: AUTHENTICATION SCREEN ===
  if (!isLoggedIn) {
    return (
      <div style={{ backgroundColor: activeTheme.bgMain, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', transition: 'background-color 0.3s' }}>
        <div style={{ backgroundColor: activeTheme.bgChat, padding: '40px', borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '60px', margin: '0 0 20px 0' }}>🦭</h1>
          <h2 style={{ color: activeTheme.textMain, margin: '0 0 10px 0' }}>Welcome to Sealfy</h2>
          <p style={{ color: activeTheme.textMuted, marginBottom: '30px' }}>Claim your spot on the ice floe.</p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input required value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Display Name (e.g. Chill Seal)" style={{ padding: '15px', borderRadius: '15px', border: 'none', backgroundColor: activeTheme.inputBg, color: activeTheme.inputText, outline: 'none', fontSize: '16px' }} />
            <input required value={usernameTag} onChange={(e) => setUsernameTag(e.target.value)} placeholder="@username (e.g. @seal_dev)" style={{ padding: '15px', borderRadius: '15px', border: 'none', backgroundColor: activeTheme.inputBg, color: activeTheme.inputText, outline: 'none', fontSize: '16px' }} />
            <button type="submit" style={{ padding: '15px', borderRadius: '15px', border: 'none', backgroundColor: activeTheme.btnBg, color: activeTheme.btnText, fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Dive In 🌊</button>
          </form>
        </div>
      </div>
    );
  }

  // === RENDER: MAIN CHAT INTERFACE ===
  return (
    <div onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{ backgroundColor: activeTheme.bgMain, minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px', display: 'flex', justifyContent: 'center', transition: 'background-color 0.3s', position: 'relative' }}>
      
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: activeTheme.dropZoneBg, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', border: `4px dashed ${activeTheme.headerBg}` }}>
          <h2 style={{ color: activeTheme.textMain, backgroundColor: activeTheme.bgChat, padding: '20px 40px', borderRadius: '30px', fontSize: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>Drop file here 🦭</h2>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '600px', backgroundColor: activeTheme.bgChat, borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'all 0.3s' }}>
        
        {/* Header */}
        <div style={{ backgroundColor: activeTheme.headerBg, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: activeTheme.textHeader, transition: 'background-color 0.3s' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>🦭 Sealfy MVP</h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}>{fullUsername}</p>
          </div>
          
          <div style={{ display: 'flex', gap: '5px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: '15px' }}>
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: '14px', marginRight: '10px' }} title="Logout">🚪</button>
            <button onClick={() => setThemeMode('light')} style={{ background: themeMode === 'light' ? '#FFF' : 'transparent', color: themeMode === 'light' ? '#000' : '#FFF', border: 'none', borderRadius: '10px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}>☀️</button>
            <button onClick={() => setThemeMode('dark')} style={{ background: themeMode === 'dark' ? '#333' : 'transparent', color: '#FFF', border: 'none', borderRadius: '10px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}>🌙</button>
          </div>
        </div>

        {/* Chat Thread */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '400px' }}>
          {messages.map((msg, idx) => {
            const isMe = msg.username === fullUsername;
            return (
              <div key={idx} style={{ padding: '12px 16px', backgroundColor: isMe ? activeTheme.msgSelf : activeTheme.msgOther, color: activeTheme.textMain, borderRadius: '20px', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', transition: 'background-color 0.3s', wordBreak: 'break-word' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: activeTheme.textMuted, marginBottom: '4px' }}>{msg.username}</strong>
                <div style={{ lineHeight: '1.4' }}>
                  {renderMessageText(msg.text, activeTheme)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Form */}
        <form onSubmit={sendMessage} style={{ padding: '20px', borderTop: `1px solid ${activeTheme.borderColor}`, display: 'flex', gap: '10px', backgroundColor: activeTheme.bgChat }}>
          <input value={text} onChange={(e) => setText(e.target.value)} disabled={isUploading} placeholder={isUploading ? "Uploading payload..." : "Type a message or drop a file..."} style={{ flex: 1, padding: '12px 20px', border: 'none', borderRadius: '25px', backgroundColor: activeTheme.inputBg, color: activeTheme.inputText, outline: 'none', transition: 'background-color 0.3s, color 0.3s' }} />
          <button type="submit" disabled={isUploading} style={{ backgroundColor: activeTheme.btnBg, color: activeTheme.btnText, border: 'none', borderRadius: '25px', padding: '0 20px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.3s', opacity: isUploading ? 0.5 : 1 }}>Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;