import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  const [currentPage, setCurrentPage] = useState('phone');
  const [countryCode, setCountryCode] = useState('+234');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [userId, setUserId] = useState(null);
  const messagesEndRef = useRef(null);

  // OTP countdown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (selectedChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat, message]);

  // Format time safely
  const formatTime = (timeString) => {
    if (!/^\d{1,2}:\d{2} [AP]M$/.test(timeString)) return timeString;
    const now = new Date();
    const [timePart, modifier] = timeString.split(' ');
    let [hours, minutes] = timePart.split(':');
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);

    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    const diffDays = Math.floor((now - time) / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? timeString : `${time.getMonth() + 1}/${time.getDate()}`;
  };

  // --- AUTH FLOW ---

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;

    // ✅ Combine country code and phone number
    const fullPhone = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await res.json();
      if (res.ok) {
        setUserId(data.userId);
        setCurrentPage('otp');
        setCountdown(60);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Network error. Is backend running?');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: otp }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);

        // If new user, go to setup
        if (!data.isExisting) {
          setCurrentPage('setup');
        } else {
          loadChats(data.token);
          setCurrentPage('chat');
        }
      } else {
        alert('Invalid OTP');
      }
    } catch (err) {
      alert('Error verifying OTP');
    }
  };

  // Step 3: Set Name (for new users)
  const handleSetupProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('/api/auth/setup-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentUser(prev => ({ ...prev, name }));
        loadChats(localStorage.getItem('token'));
        setCurrentPage('chat');
      }
    } catch (err) {
      alert('Failed to set name');
    }
  };

  const loadChats = async (token) => {
    try {
      const res = await fetch('/api/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setChats(data);
    } catch (err) {
      console.error('Failed to load chats', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/chats/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: selectedChat.id,
          text: message
        })
      });

      const updatedChat = await res.json();
      if (res.ok) {
        setChats(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
        setSelectedChat(updatedChat);
        setMessage('');
      }
    } catch (err) {
      console.error('Send failed', err);
    }
  };

  const handleLogout = () => {
    setCurrentPage('phone');
    setCurrentUser(null);
    setSelectedChat(null);
    setChats([]);
    setPhoneNumber('');
    setOtp('');
    setName('');
    setUserId(null);
    setCountdown(0);
    localStorage.removeItem('token');
  };

  // --- RENDER PAGES ---

  if (currentPage === 'phone') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Whisper</h1>
            <p className="text-gray-600 mt-2">Enter your phone number to continue</p>
          </div>

          <form onSubmit={handleSendOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="flex gap-2 w-full">
  <select
    value={countryCode}
    onChange={(e) => setCountryCode(e.target.value)}
    className="w-36 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
  >
    <option value="+234">🇳🇬 +234 (Nigeria)</option>
    <option value="+1">🇺🇸 +1 (US/Canada)</option>
    <option value="+44">🇬🇧 +44 (UK)</option>
    <option value="+91">🇮🇳 +91 (India)</option>
    <option value="+254">🇰🇪 +254 (Kenya)</option>
    <option value="+61">🇦🇺 +61 (Australia)</option>
  </select>
  <input
    type="tel"
    value={phoneNumber}
    onChange={(e) => setPhoneNumber(e.target.value)}
    placeholder="803 123 4567"
    className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
    required
  />
</div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Send OTP
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (currentPage === 'otp') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Verify Your Number</h1>
            <p className="text-gray-600 mt-2">We've sent a 6-digit code to {countryCode} {phoneNumber}</p>
          </div>

          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength="6"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg"
                required
              />
            </div>
            <p className="text-sm text-gray-500 text-center">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={countdown > 0}
                className={`text-green-600 hover:text-green-700 ${countdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend'}
              </button>
            </p>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Verify
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (currentPage === 'setup') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Almost Done!</h1>
            <p className="text-gray-600 mt-2">Set your name to get started</p>
          </div>

          <form onSubmit={handleSetupProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (currentPage === 'chat' && currentUser) {
    const filteredChats = chats.filter(chat =>
      chat.name.toLowerCase().includes('')
    );

    return (
      <div className="h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 bg-green-600 text-white flex items-center justify-between">
            <h1 className="text-xl font-semibold">Whisper</h1>
            <div className="flex space-x-3">
              <button className="hover:bg-white/20 p-2 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-gray-200 flex items-center space-x-3">
            <img
              src={`https://placehold.co/40x40/6366f1/ffffff?text=${currentUser?.name?.charAt(0) || 'U'}`}
              alt={currentUser?.name || 'User'}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{currentUser.name}</h3>
              <p className="text-sm text-gray-500">{currentUser.phone}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 p-2 rounded-full transition-colors"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Search or start new chat"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400 absolute left-3 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedChat?.id === chat.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={chat.avatar.trim()}
                    alt={chat.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{chat.name}</h3>
                      <p className="text-xs text-gray-500">{formatTime(chat.time)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                      {chat.unread > 0 && (
                        <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedChat.avatar.trim()}
                    alt={selectedChat.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{selectedChat.name}</h2>
                    <p className="text-sm text-gray-500">online</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 bg-gray-100 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {selectedChat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.sender === 'me'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-800 shadow'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.sender === 'me' ? 'text-green-100' : 'text-gray-500'
                          }`}
                        >
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-3">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message"
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Whisper</h2>
                <p className="text-gray-600">Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default App;