import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Shield, Mic, MicOff, Settings, Wifi, WifiOff, ChevronDown, Upload, Volume2, Zap } from 'lucide-react';

const FraudDetectionApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastActivity, setLastActivity] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [alarmSound, setAlarmSound] = useState(null);
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(true);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [batchMode, setBatchMode] = useState('aggressive'); // 'aggressive', 'balanced', 'sensitive'

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimeoutRef = useRef(null);
  const alarmAudioRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const lastApiCallTimeRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const animationFrameRef = useRef(null);

  const batchSettings = {
    aggressive: { silenceMs: 3000, minAudioLength: 3, apiCooldown: 8000, description: 'Max savings - 3s silence, 8s cooldown' },
    balanced: { silenceMs: 2000, minAudioLength: 2, apiCooldown: 5000, description: 'Balanced - 2s silence, 5s cooldown' },
    sensitive: { silenceMs: 1500, minAudioLength: 1, apiCooldown: 3000, description: 'More responsive - 1.5s silence, 3s cooldown' }
  };

  const instructions = {
    english: [
      "Enter your Gemini API key in settings",
      "Select batch mode (Aggressive recommended for free tier)",
      "Join your video call (GMeet, Zoom, Teams)",
      "Click \"Start Monitoring\" and allow audio permissions",
      "The app batches audio to minimize API calls",
      "Fraud alerts appear when suspicious speech is detected"
    ],
    hindi: [
      "सेटिंग्स में अपनी Gemini API key डालें",
      "बैच मोड चुनें (फ्री टियर के लिए Aggressive अनुशंसित)",
      "अपनी वीडियो कॉल में शामिल हों",
      "\"Start Monitoring\" पर क्लिक करें",
      "ऐप API कॉल कम करने के लिए ऑडियो को बैच करता है",
      "संदिग्ध बातचीत पर धोखाधड़ी की चेतावनी दिखाई देती है"
    ],
    marathi: [
      "सेटिंग्जमध्ये API key टाका",
      "बॅच मोड निवडा (फ्री टियरसाठी Aggressive शिफारस केलेले)",
      "तुमच्या व्हिडिओ कॉलमध्ये सहभागी व्हा",
      "\"Start Monitoring\" वर क्लिक करा",
      "अॅप API कॉल कमी करण्यासाठी ऑडिओ बॅच करते",
      "संशयास्पद संभाषणावर फसवणूक अलर्ट दिसतात"
    ],
    gujarati: [
      "સેટિંગ્સમાં API key દાખલ કરો",
      "બેચ મોડ પસંદ કરો (ફ્રી ટાયર માટે Aggressive ભલામણ)",
      "તમારા વિડિઓ કૉલમાં જોડાઓ",
      "\"Start Monitoring\" પર ક્લિક કરો",
      "એપ API કૉલ ઘટાડવા માટે ઑડિયો બેચ કરે છે",
      "શંકાસ્પદ વાતચીત પર છેતરપિંડી અલર્ટ દેખાય છે"
    ],
    tamil: [
      "அமைப்புகளில் API key ஐ உள்ளிடவும்",
      "பேட்ச் பயன்முறையைத் தேர்ந்தெடுக்கவும்",
      "உங்கள் வீடியோ அழைப்பில் சேரவும்",
      "\"Start Monitoring\" ஐ கிளிக் செய்யவும்",
      "API அழைப்புகளைக் குறைக்க ஆடியோ பேட்ச் செய்யப்படுகிறது",
      "சந்தேகத்திற்குரிய உரையாடலில் மோசடி எச்சரிக்கை"
    ],
    telugu: [
      "సెట్టింగులలో API key ఎంటర్ చేయండి",
      "బ్యాచ్ మోడ్ ఎంచుకోండి",
      "మీ వీడియో కాల్‌లో చేరండి",
      "\"Start Monitoring\" క్లిక్ చేయండి",
      "API కాల్‌లను తగ్గించడానికి ఆడియో బ్యాచ్ చేయబడుతుంది",
      "అనుమానాస్పద సంభాషణలో మోసం హెచ్చరికలు"
    ]
  };

  const languageNames = {
    english: "English",
    hindi: "हिंदी",
    marathi: "मराठी",
    gujarati: "ગુજરાતી",
    tamil: "தமிழ்",
    telugu: "తెలుగు"
  };

  const FRAUD_DETECTION_PROMPT = `You are a financial scam detection expert. Analyze the speech and determine if it's a scam.

SCAM INDICATORS:
- Urgency/fear tactics (account blocked, suspended)
- Requests for OTP, PIN, passwords, CVV
- Lottery/prize claims, congratulations messages
- Impersonation (bank, police, government)
- Suspicious payment requests
- Phishing attempts

Respond ONLY with JSON:
{
  "is_scam": true/false,
  "confidence_score": 0.0-1.0,
  "reasoning": "Brief explanation in same language as input",
  "recommendation": "Action advice for user"
}`;

  // Analyze audio with Gemini API (batched approach)
  const analyzeAudioBatch = async (audioBlob) => {
    const now = Date.now();
    const settings = batchSettings[batchMode];
    
    // Rate limiting check
    if (now - lastApiCallTimeRef.current < settings.apiCooldown) {
      console.log('⏳ Skipping API call - cooldown period');
      return;
    }

    try {
      setApiCallCount(prev => prev + 1);
      lastApiCallTimeRef.current = now;

      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        
        // Call Gemini API with audio
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: FRAUD_DETECTION_PROMPT },
                {
                  inline_data: {
                    mime_type: audioBlob.type,
                    data: base64Audio
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          
          if (response.status === 429) {
            alert('⚠️ Rate limit exceeded! Switch to "Aggressive" mode or wait a minute.');
          }
          return;
        }

        const data = await response.json();
        console.log('API Response:', data);

        // Extract text from response
        if (data.candidates && data.candidates[0]?.content?.parts) {
          const text = data.candidates[0].content.parts[0].text;
          setTranscript(prev => prev + `\n[${new Date().toLocaleTimeString()}] ${text}\n`);
          setLastActivity(new Date().toLocaleTimeString());

          // Parse fraud analysis
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysis = JSON.parse(jsonMatch[0]);
              
              if (analysis.is_scam && analysis.confidence_score > 0.6) {
                triggerFraudAlert(analysis);
                playAlarmSound();
              }
            }
          } catch (e) {
            console.error('Error parsing fraud analysis:', e);
          }
        }
      };
    } catch (error) {
      console.error('Error analyzing audio:', error);
    }
  };

  // Trigger fraud alert
  const triggerFraudAlert = (analysis) => {
    const alert = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      confidence: analysis.confidence_score,
      reasoning: analysis.reasoning,
      recommendation: analysis.recommendation,
      type: 'ai'
    };
    
    setFraudAlerts(prev => [alert, ...prev.slice(0, 4)]);
  };

  // Play alarm sound
  const playAlarmSound = () => {
    if (isAlarmEnabled && alarmAudioRef.current && alarmSound) {
      alarmAudioRef.current.currentTime = 0;
      alarmAudioRef.current.volume = 1.0;
      alarmAudioRef.current.play().catch(err => {
        console.error('Alarm play error:', err);
        alert('🚨 FRAUD DETECTED! Check alerts below.');
      });
    }
  };

  // Handle alarm upload
  const handleAlarmUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      setAlarmSound(url);
      if (alarmAudioRef.current) {
        alarmAudioRef.current.src = url;
        alarmAudioRef.current.load();
      }
    }
  };

  // Initialize audio capture with batching
  const initializeAudioCapture = async () => {
    try {
      console.log('🎤 Initializing audio capture...');
      
      let stream;
      try {
        console.log('📺 Trying to capture display audio (for screen share)...');
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: false,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        console.log('✅ Display audio captured successfully');
      } catch (err) {
        console.log('⚠️ Display media not available, using microphone...', err.message);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        console.log('✅ Microphone captured successfully');
      }

      streamRef.current = stream;
      console.log('🎵 Audio tracks:', stream.getAudioTracks().map(t => `${t.label} (enabled: ${t.enabled})`));

      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      console.log('✅ Audio context created, sample rate:', audioContext.sampleRate, 'Hz');

      // MediaRecorder for batching
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      
      console.log('📼 Using MIME type:', mimeType || 'default');
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('📦 Audio chunk received:', event.data.size, 'bytes');
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ MediaRecorder stopped, total chunks:', audioChunksRef.current.length);
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          
          console.log(`📊 Audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
          
          const settings = batchSettings[batchMode];
          const estimatedDuration = audioBlob.size / 16000;
          
          if (estimatedDuration >= settings.minAudioLength) {
            console.log(`📤 Sending audio for analysis (~${estimatedDuration.toFixed(1)}s)`);
            analyzeAudioBatch(audioBlob);
          } else {
            console.log(`⏩ Audio too short (${estimatedDuration.toFixed(1)}s < ${settings.minAudioLength}s)`);
          }
          
          audioChunksRef.current = [];
        }
      };

      mediaRecorder.onerror = (error) => {
        console.error('❌ MediaRecorder error:', error);
      };

      console.log('✅ MediaRecorder ready, initial state:', mediaRecorder.state);

      // Voice Activity Detection Loop
      const detectSpeech = () => {
        if (!analyserRef.current) {
          console.error('❌ Analyser not available in detection loop');
          return;
        }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Update UI (normalize to 0-100 range)
        const normalizedLevel = Math.min(100, average * 3);
        setAudioLevel(normalizedLevel);

        // Periodic logging (every ~50 frames to reduce spam)
        if (Math.random() < 0.02) {
          console.log('🔊 Audio level:', average.toFixed(2), '| Normalized:', normalizedLevel.toFixed(1));
        }

        // Speech detection threshold
        const speechThreshold = 8;
        const isSpeaking = average > speechThreshold;

        if (isSpeaking && !isSpeakingRef.current) {
          // Speech started
          console.log('🎤 ===== SPEECH DETECTED =====');
          console.log('   Level:', average.toFixed(2), '| Threshold:', speechThreshold);
          isSpeakingRef.current = true;
          audioChunksRef.current = [];
          
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
            try {
              mediaRecorderRef.current.start(100); // Record in 100ms chunks
              console.log('▶️ Recording STARTED');
            } catch (e) {
              console.error('❌ Failed to start recording:', e);
            }
          }
          
          // Clear any existing silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        } else if (isSpeaking && isSpeakingRef.current) {
          // Still speaking - reset silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          
          const settings = batchSettings[batchMode];
          silenceTimeoutRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              console.log('⏸️ Silence timeout triggered - stopping recording');
              try {
                mediaRecorderRef.current.stop();
                isSpeakingRef.current = false;
              } catch (e) {
                console.error('❌ Error stopping recorder:', e);
              }
            }
          }, settings.silenceMs);
        }

        // Continue the loop
        animationFrameRef.current = requestAnimationFrame(detectSpeech);
      };

      // Start the detection loop
      console.log('🚀 Starting continuous voice detection loop...');
      detectSpeech();
      
      return stream;
    } catch (error) {
      console.error('❌ Fatal error in audio capture:', error);
      throw error;
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!apiKey) {
      alert('Please set your Gemini API key in settings first');
      return;
    }

    try {
      setConnectionStatus('connecting');
      await initializeAudioCapture();
      setIsRecording(true);
      setConnectionStatus('connected');
      setTranscript('');
      setFraudAlerts([]);
      setApiCallCount(0);
      console.log('✅ Monitoring started with', batchMode, 'mode');
    } catch (error) {
      console.error('Error starting recording:', error);
      setConnectionStatus('error');
      alert('Failed to start recording. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('🛑 Stopping monitoring...');
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping recorder:', e);
      }
      mediaRecorderRef.current = null;
    }
    
    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 Stopped track:', track.label);
      });
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Clear timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Reset state
    setIsRecording(false);
    setConnectionStatus('disconnected');
    setAudioLevel(0);
    isSpeakingRef.current = false;
    
    console.log('✅ Monitoring stopped');
  };

  // Load API key
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) setApiKey(savedApiKey);
  }, []);

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setShowSettings(false);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (isRecording) stopRecording();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold">FraudLens Live</h1>
            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Optimized</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>API Calls: {apiCallCount}</span>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Gemini API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-white/60 mt-2">
                  Get free API key: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Batch Mode (API Optimization)</label>
                <div className="space-y-2">
                  {Object.entries(batchSettings).map(([mode, config]) => (
                    <label key={mode} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="radio"
                        name="batchMode"
                        value={mode}
                        checked={batchMode === mode}
                        onChange={(e) => setBatchMode(e.target.value)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium capitalize">{mode}</div>
                        <div className="text-xs text-white/60">{config.description}</div>
                      </div>
                      {mode === 'aggressive' && (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Free Tier</span>
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-yellow-200/80 mt-2">
                  💡 Aggressive mode recommended for free tier (5 RPM limit)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Alarm Sound</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAlarmUpload}
                      className="hidden"
                      id="alarm-upload"
                    />
                    <label
                      htmlFor="alarm-upload"
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Alarm</span>
                    </label>
                    {alarmSound && (
                      <button
                        onClick={playAlarmSound}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Test</span>
                      </button>
                    )}
                  </div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isAlarmEnabled}
                      onChange={(e) => setIsAlarmEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Enable alarm for fraud alerts</span>
                  </label>
                </div>
              </div>

              <button
                onClick={saveApiKey}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Main Control */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-lg font-medium">
                {connectionStatus === 'connected' ? 'Monitoring' : 'Stopped'}
              </span>
              {lastActivity && <span className="text-sm text-white/70">Last: {lastActivity}</span>}
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-white/70">Audio:</div>
              <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-yellow-400 transition-all duration-100"
                  style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={!apiKey}
                className={`flex items-center space-x-2 px-8 py-4 rounded-full text-lg font-semibold transition-all ${
                  apiKey ? 'bg-green-600 hover:bg-green-700 hover:scale-105' : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                <Mic className="w-6 h-6" />
                <span>Start Monitoring</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 px-8 py-4 bg-red-600 hover:bg-red-700 rounded-full text-lg font-semibold hover:scale-105 transition-all"
              >
                <MicOff className="w-6 h-6" />
                <span>Stop Monitoring</span>
              </button>
            )}
          </div>
        </div>

        {/* Fraud Alerts */}
        {fraudAlerts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-red-400 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2" />
              FRAUD ALERTS ({fraudAlerts.length})
            </h2>
            {fraudAlerts.map((alert) => (
              <div key={alert.id} className="bg-red-900/40 border-2 border-red-500 rounded-xl p-4 animate-pulse">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-red-300">🚨 SCAM DETECTED</span>
                  <span className="text-sm text-red-300">{alert.timestamp}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Confidence: </span>
                    <span className="text-red-300">{(alert.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="font-medium">Reasoning: </span>
                    <span>{alert.reasoning}</span>
                  </div>
                  <div>
                    <span className="font-medium">Recommendation: </span>
                    <span className="text-yellow-300">{alert.recommendation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Analysis Log</h2>
            <div className="bg-black/20 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
              <pre className="text-white/90 whitespace-pre-wrap">{transcript}</pre>
            </div>
            <button
              onClick={() => setTranscript('')}
              className="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            >
              Clear Log
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">How to Use</h2>
            <div className="relative">
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20"
              >
                <span>{languageNames[selectedLanguage]}</span>
                <ChevronDown className={`w-4 h-4 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLanguageDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-black/80 border border-white/20 rounded-lg shadow-lg z-10">
                  {Object.entries(languageNames).map(([key, name]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedLanguage(key);
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg ${
                        selectedLanguage === key ? 'bg-blue-600/50' : ''
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2 text-white/80">
            {instructions[selectedLanguage].map((instruction, index) => (
              <p key={index}>{index + 1}. {instruction}</p>
            ))}
          </div>
        </div>

        <audio ref={alarmAudioRef} preload="auto" style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default FraudDetectionApp;