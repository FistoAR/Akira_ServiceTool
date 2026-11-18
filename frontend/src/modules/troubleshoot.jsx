import { useState, useRef, useEffect } from "react";
import {
  Send,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Type,
  Lock,
  LogOut,
  Plus,
  Trash2,
  X,
  Download,
  Eye,
  MessageSquare,
} from "lucide-react";

export default function CustomerCareBot() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! 👋 I'm here to help you with your queries. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Admin state
  const [solutions, setSolutions] = useState([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL1 = import.meta.env.VITE_API_BASE_URL1;

  const [editMode, setEditMode] = useState(false);
  const [currentSolution, setCurrentSolution] = useState({
    title: "",
    keywords: "",
    responseText: "",
    images: [],
    videos: [],
  });
  const [imageLoading, setImageLoading] = useState({});
  const [videoLoading, setVideoLoading] = useState({});
  const [viewerMedia, setViewerMedia] = useState(null);
  const [showUnanswered, setShowUnanswered] = useState(false);

  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load solutions and unanswered questions from API
  useEffect(() => {
    loadSolutions();
    if (isAdmin) {
      loadUnansweredQuestions();
    }
  }, [isAdmin]);

  const loadSolutions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/solutions`);
      const data = await response.json();
      setSolutions(data);
    } catch (error) {
      console.error("Error loading solutions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnansweredQuestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/unanswered`);
      const data = await response.json();
      setUnansweredQuestions(data);
    } catch (error) {
      console.error("Error loading unanswered questions:", error);
    }
  };

  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;

    const editDistance = (s1, s2) => {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    };

    return (longer.length - editDistance(longer, shorter)) / longer.length;
  };

  const findBestMatch = (query) => {
    const queryLower = query.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const solution of solutions) {
      let score = 0;
      for (const keyword of solution.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (queryLower.includes(keywordLower) || keywordLower.includes(queryLower)) {
          score += 3;
        }
        const similarity = calculateSimilarity(queryLower, keywordLower);
        if (similarity > 0.7) {
          score += similarity * 2;
        }
        const queryWords = queryLower.split(/\s+/);
        const keywordWords = keywordLower.split(/\s+/);
        for (const qWord of queryWords) {
          for (const kWord of keywordWords) {
            if (qWord === kWord) {
              score += 1;
            } else if (calculateSimilarity(qWord, kWord) > 0.8) {
              score += 0.5;
            }
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = solution;
      }
    }
    return { bestMatch, score: bestScore };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { from: "user", text: userMessage }]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            from: "bot",
            text: data.reply,
            images: data.images || [],
            videos: data.videos || [],
          },
        ]);
        setIsTyping(false);
      }, 800);
    } catch (error) {
      console.error("API Error:", error);
      setTimeout(() => {
        const { bestMatch, score } = findBestMatch(userMessage);
        if (!bestMatch || score < 0.5) {
          setMessages((prev) => [
            ...prev,
            {
              from: "bot",
              text: "I apologize, but I couldn't find a specific solution for your query. Our support team will contact you shortly.",
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              from: "bot",
              text: bestMatch.responseText,
              images: bestMatch.images,
              videos: bestMatch.videos,
            },
          ]);
        }
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleAdminLogin = () => {
    if (password === "1234") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setPassword("");
    } else {
      alert("❌ Incorrect password");
    }
  };

  const handleSaveSolution = async () => {
    if (!currentSolution.title || !currentSolution.keywords || !currentSolution.responseText) {
      alert("⚠️ Please fill in all required fields");
      return;
    }

    const keywords = currentSolution.keywords.split(",").map((k) => k.trim()).filter((k) => k);

    try {
      const method = currentSolution._id ? "PUT" : "POST";
      const url = currentSolution._id 
        ? `${API_BASE_URL}/solutions/${currentSolution._id}`
        : `${API_BASE_URL}/solutions`;

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: currentSolution.title,
          keywords: keywords,
          responseText: currentSolution.responseText,
          images: currentSolution.images,
          videos: currentSolution.videos,
        }),
      });

      const savedSolution = await response.json();

      if (currentSolution._id) {
        setSolutions((prev) => prev.map(s => s._id === savedSolution._id ? savedSolution : s));
      } else {
        setSolutions((prev) => [...prev, savedSolution]);
      }

      setCurrentSolution({
        title: "",
        keywords: "",
        responseText: "",
        images: [],
        videos: [],
      });
      setEditMode(false);
      alert("✅ Solution saved successfully!");
    } catch (error) {
      console.error("Error saving solution:", error);
      alert("❌ Failed to save solution. Please try again.");
    }
  };

  const handleFileUpload = async (type) => {
    const inputRef = type === "image" ? imageInputRef : videoInputRef;
    inputRef.current?.click();
  };

  const handleFileChange = async (e, type) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();

        const fileData = {
          originalName: data.file.originalName,
          convertedName: data.file.convertedName,
          path: data.file.path,
          url: data.file.url,
          timestamp: data.file.timestamp,
          type: data.file.type,
        };

        if (type === "image") {
          setCurrentSolution((prev) => ({
            ...prev,
            images: [...prev.images, fileData],
          }));
        } else if (type === "video") {
          setCurrentSolution((prev) => ({
            ...prev,
            videos: [...prev.videos, fileData],
          }));
        }
      } catch (error) {
        console.error("Upload error:", error);
        alert(`❌ Failed to upload ${file.name}`);
      }
    }

    alert(`✅ ${files.length} ${type}(s) uploaded successfully!`);
    e.target.value = "";
  };

  const handleDeleteSolution = async (id) => {
    if (!confirm("Are you sure you want to delete this solution?")) return;

    try {
      await fetch(`${API_BASE_URL}/solutions/${id}`, {
        method: "DELETE",
      });
      setSolutions((prev) => prev.filter((s) => s._id !== id));
      alert("✅ Solution deleted");
    } catch (error) {
      console.error("Error deleting solution:", error);
      alert("❌ Failed to delete solution");
    }
  };

  const handleRemoveMedia = (type, index) => {
    if (type === "image") {
      setCurrentSolution((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    } else {
      setCurrentSolution((prev) => ({
        ...prev,
        videos: prev.videos.filter((_, i) => i !== index),
      }));
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('❌ Failed to download file');
    }
  };

  const handleUseQuestion = (question) => {
    setCurrentSolution({
      title: question.query,
      keywords: question.query,
      responseText: "",
      images: [],
      videos: [],
    });
    setEditMode(true);
    setShowUnanswered(false);
  };

  const handleDeleteQuestion = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/unanswered/${id}`, {
        method: "DELETE",
      });
      setUnansweredQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  if (showAdminLogin) {
    return (
      <div
        style={{
          minHeight: "84vh",
        //   background: "linear-gradient(to bottom right, #1a1a1a, #000)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            background: "#2d2d2d",
            padding: "32px",
            borderRadius: "16px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            maxWidth: "448px",
            width: "100%",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: "white",
                padding: "16px",
                borderRadius: "9999px",
              }}
            >
              <Lock style={{ width: "32px", height: "32px", color: "#1a1a1a" }} />
            </div>
          </div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            Admin Login
          </h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
            placeholder="Enter password"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "#404040",
              color: "white",
              borderRadius: "8px",
              marginBottom: "16px",
              border: "none",
              outline: "none",
            }}
          />
          <button
            onClick={handleAdminLogin}
            style={{
              width: "100%",
              background: "#2563eb",
              color: "white",
              padding: "12px",
              borderRadius: "8px",
              fontWeight: "600",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.background = "#1d4ed8")}
            onMouseOut={(e) => (e.target.style.background = "#2563eb")}
          >
            Login
          </button>
          <button
            onClick={() => setShowAdminLogin(false)}
            style={{
              width: "100%",
              marginTop: "12px",
              background: "#404040",
              color: "white",
              padding: "12px",
              borderRadius: "8px",
              fontWeight: "600",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.background = "#525252")}
            onMouseOut={(e) => (e.target.style.background = "#404040")}
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        // minHeight: "100vh",
        maxHeight: "100vh",
        // background: "linear-gradient(to bottom right, #1a1a1a, #000)",
        color: "white",
      }}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFileChange(e, "image")}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFileChange(e, "video")}
      />

      {viewerMedia && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
          }}
          onClick={() => setViewerMedia(null)}
        >
          <button
            onClick={() => setViewerMedia(null)}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
            //   background: "#404040",
              border: "none",
              borderRadius: "50%",
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
            }}
          >
            <X style={{ width: "24px", height: "24px" }} />
          </button>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90%", maxHeight: "90%" }}>
            {viewerMedia.type === "image" ? (
              <img
                src={viewerMedia.url}
                alt=""
                style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "8px" }}
              />
            ) : (
              <video
                src={viewerMedia.url}
                controls
                autoPlay
                style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "8px" }}
              />
            )}
          </div>
        </div>
      )}


      <div className="absolute z-10 right-[29px] cursor-pointer">
        <button
        className=""
          onClick={() => (isAdmin ? setIsAdmin(false) : setShowAdminLogin(true))}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0.5rem 1rem",
            background: "#2b7fff",
            borderRadius: "8px",
            border: "none",
            color: "white",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => (e.target.style.background = "#1370fa")}
          onMouseOut={(e) => (e.target.style.background = "#2b7fff")}
        >
          {isAdmin ? (
            <>
              <LogOut style={{ width: "16px", height: "16px" }} /> Exit Admin
            </>
          ) : (
            <>
              <Lock style={{ width: "16px", height: "16px" }} /> Admin
            </>
          )}
        </button>
      </div>

      <div style={{ display: "flex", height: "calc(98vh - 80px)" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            maxWidth: isAdmin ? "720px" : "1440px",
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
            className="custom-scrollbar"
          >
            <div
              style={{
                maxWidth: "75%",
                width: "100%",
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                    animation: "slideIn 0.3s ease-out",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "1rem 1.5rem",
                      borderRadius: "16px",
                      background: msg.from === "user" ? "#2563eb" : "#2d2d2d",
                      color: "white",
                      borderBottomRightRadius: msg.from === "user" ? "4px" : "16px",
                      borderBottomLeftRadius: msg.from === "bot" ? "4px" : "16px",
                      boxShadow: msg.from === "bot" ? "0 4px 10px rgba(0,0,0,0.3)" : "none",
                    }}
                  >
                    <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.text}</p>
                    {msg.images && msg.images.length > 0 && (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {msg.images.map((img, imgIdx) => {
                          const imgKey = `${idx}-${imgIdx}`;
                          return (
                            <div key={imgIdx} style={{ position: "relative" }}>
                              {imageLoading[imgKey] && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    zIndex: 10,
                                  }}
                                >
                                  <div className="spinner"></div>
                                </div>
                              )}
                              <img
                                src={API_BASE_URL1 + img.path}
                                alt=""
                                style={{
                                  maxWidth: "100%",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  opacity: imageLoading[imgKey] ? 0.5 : 1,
                                  transition: "opacity 0.3s",
                                }}
                                onLoad={() => setImageLoading((prev) => ({ ...prev, [imgKey]: false }))}
                                onLoadStart={() => setImageLoading((prev) => ({ ...prev, [imgKey]: true }))}
                                onClick={() =>
                                  setViewerMedia({
                                    type: "image",
                                    url: API_BASE_URL1 + img.path,
                                  })
                                }
                              />
                              <div style={{ marginTop: "4px", display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() =>
                                    setViewerMedia({
                                      type: "image",
                                      url: API_BASE_URL1 + img.path,
                                    })
                                  }
                                  style={{
                                    background: "#404040",
                                    color: "white",
                                    border: "none",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    transition: "background 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  onMouseOver={(e) => (e.target.style.background = "#525252")}
                                  onMouseOut={(e) => (e.target.style.background = "#404040")}
                                >
                                  <Eye style={{ width: "12px", height: "12px" }} />
                                  View
                                </button>
                                <button
                                  onClick={() => handleDownload(API_BASE_URL1 + img.path, img.originalName)}
                                  style={{
                                    background: "#404040",
                                    color: "white",
                                    border: "none",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    transition: "background 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  onMouseOver={(e) => (e.target.style.background = "#525252")}
                                  onMouseOut={(e) => (e.target.style.background = "#404040")}
                                >
                                  <Download style={{ width: "12px", height: "12px" }} />
                                  Download
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {msg.videos && msg.videos.length > 0 && (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {msg.videos.map((vid, vidIdx) => {
                          const vidKey = `${idx}-${vidIdx}`;
                          return (
                            <div key={vidIdx} style={{ position: "relative" }}>
                              {videoLoading[vidKey] && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    zIndex: 10,
                                  }}
                                >
                                  <div className="spinner"></div>
                                </div>
                              )}
                              <video
                                src={API_BASE_URL1 + vid.path}
                                controls
                                style={{
                                  maxWidth: "100%",
                                  borderRadius: "8px",
                                  opacity: videoLoading[vidKey] ? 0.5 : 1,
                                  transition: "opacity 0.3s",
                                }}
                                onLoadStart={() => setVideoLoading((prev) => ({ ...prev, [vidKey]: true }))}
                                onCanPlay={() => setVideoLoading((prev) => ({ ...prev, [vidKey]: false }))}
                              />
                              <div style={{ marginTop: "4px", display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() =>
                                    setViewerMedia({
                                      type: "video",
                                      url: API_BASE_URL1 + vid.path,
                                    })
                                  }
                                  style={{
                                    background: "#404040",
                                    color: "white",
                                    border: "none",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    transition: "background 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  onMouseOver={(e) => (e.target.style.background = "#525252")}
                                  onMouseOut={(e) => (e.target.style.background = "#404040")}
                                >
                                  <Eye style={{ width: "12px", height: "12px" }} />
                                  View
                                </button>
                                <button
                                  onClick={() => handleDownload(API_BASE_URL1 + vid.path, vid.originalName)}
                                  style={{
                                    background: "#404040",
                                    color: "white",
                                    border: "none",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    transition: "background 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  onMouseOver={(e) => (e.target.style.background = "#525252")}
                                  onMouseOut={(e) => (e.target.style.background = "#404040")}
                                >
                                  <Download style={{ width: "12px", height: "12px" }} />
                                  Download
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div style={{ display: "flex", justifyContent: "flex-start", animation: "slideIn 0.3s ease-out" }}>
                  <div
                    style={{
                      background: "#2d2d2d",
                      padding: "1rem 1.5rem",
                      borderRadius: "16px",
                      borderBottomLeftRadius: "4px",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          background: "#a0a0a0",
                          borderRadius: "9999px",
                          animation: "bounce 1s infinite",
                        }}
                      ></div>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          background: "#a0a0a0",
                          borderRadius: "9999px",
                          animation: "bounce 1s infinite 0.2s",
                        }}
                      ></div>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          background: "#a0a0a0",
                          borderRadius: "9999px",
                          animation: "bounce 1s infinite 0.4s",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div
            style={{
              padding: "1rem 1.5rem",
              maxWidth: "75%",
              width: "100%",
              margin: "0 auto",
            }}
          >
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your question..."
                style={{
                  flex: 1,
                  padding: "1rem 1.5rem",
                  background: "#ffffff",
                  color: "black",
                  borderRadius: "9999px",
                  border: "none",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  background: "#2563eb",
                  padding: "16px",
                  borderRadius: "9999px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  transform: "scale(1)",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "#1d4ed8";
                  e.target.style.transform = "scale(1.05)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "#2563eb";
                  e.target.style.transform = "scale(1)";
                }}
              >
                <Send style={{ width: "20px", height: "20px", color: "white" }} />
              </button>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div
            style={{
              width: "504px",
              background: "#2d2d2d",
              borderLeft: "1px solid #404040",
              padding: "24px",
              overflowY: "auto",
            }}
            className="custom-scrollbar rounded-lg mt-[5.5vh]"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
                🛠️ Admin Panel
              </h2>
              <button
                onClick={() => setShowUnanswered(!showUnanswered)}
                style={{
                  background: "#404040",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                }}
              >
                <MessageSquare style={{ width: "16px", height: "16px" }} />
                {unansweredQuestions.length > 0 && (
                  <span
                    style={{
                      background: "#ef4444",
                      padding: "0.125rem 0.5rem",
                      borderRadius: "9999px",
                      fontSize: "12px",
                    }}
                  >
                    {unansweredQuestions.length}
                  </span>
                )}
              </button>
            </div>

            {showUnanswered ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>
                    Unanswered Questions
                  </h3>
                  <button
                    onClick={() => setShowUnanswered(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#a0a0a0",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Back
                  </button>
                </div>
                {unansweredQuestions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px", color: "#a0a0a0" }}>
                    No unanswered questions
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {unansweredQuestions.map((q) => (
                      <div
                        key={q._id}
                        style={{
                          background: "#404040",
                          padding: "16px",
                          borderRadius: "8px",
                        }}
                      >
                        <p style={{ margin: "0 0 0.5rem 0", fontSize: "14px" }}>
                          {q.query}
                        </p>
                        <div style={{ display: "flex", gap: "8px", fontSize: "12px", color: "#a0a0a0" }}>
                          <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                          <button
                            onClick={() => handleUseQuestion(q)}
                            style={{
                              flex: 1,
                              background: "#2563eb",
                              color: "white",
                              border: "none",
                              padding: "8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            Create Solution
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q._id)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : loading ? (
              <div style={{ textAlign: "center", padding: "32px", color: "#a0a0a0" }}>
                Loading solutions...
              </div>
            ) : !editMode ? (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    width: "100%",
                    background: "#2563eb",
                    padding: "12px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => (e.target.style.background = "#1d4ed8")}
                  onMouseOut={(e) => (e.target.style.background = "#2563eb")}
                >
                  <Plus style={{ width: "20px", height: "20px" }} /> Add New Solution
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {solutions.map((sol) => (
                    <div
                      key={sol._id}
                      style={{
                        background: "#404040",
                        padding: "16px",
                        borderRadius: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <h3 style={{ fontWeight: "600", margin: 0 }}>{sol.title}</h3>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => {
                              setCurrentSolution({
                                ...sol,
                                keywords: sol.keywords.join(", "),
                              });
                              setEditMode(true);
                            }}
                            style={{
                              color: "#60a5fa",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSolution(sol._id)}
                            style={{
                              color: "#f87171",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            <Trash2 style={{ width: "16px", height: "16px" }} />
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize: "14px", color: "#a0a0a0", margin: 0 }}>
                        Keywords: {sol.keywords.join(", ")}
                      </p>
                      {(sol.images?.length > 0 || sol.videos?.length > 0) && (
                        <p style={{ fontSize: "12px", color: "#a0a0a0", marginTop: "8px", margin: 0 }}>
                          {sol.images?.length > 0 && `📷 ${sol.images.length} image(s) `}
                          {sol.videos?.length > 0 && `🎥 ${sol.videos.length} video(s)`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Title *
                  </label>
                  <input
                    value={currentSolution.title}
                    onChange={(e) =>
                      setCurrentSolution({
                        ...currentSolution,
                        title: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem 1rem",
                      background: "#404040",
                      borderRadius: "8px",
                      border: "none",
                      color: "white",
                      outline: "none",
                    }}
                    placeholder="e.g., How to reset the switch"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Keywords * (comma-separated)
                  </label>
                  <input
                    value={currentSolution.keywords}
                    onChange={(e) =>
                      setCurrentSolution({
                        ...currentSolution,
                        keywords: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem 1rem",
                      background: "#404040",
                      borderRadius: "8px",
                      border: "none",
                      color: "white",
                      outline: "none",
                    }}
                    placeholder="reset, restart, reboot"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Response Text *
                  </label>
                  <textarea
                    value={currentSolution.responseText}
                    onChange={(e) =>
                      setCurrentSolution({
                        ...currentSolution,
                        responseText: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem 1rem",
                    //   background: "#404040",
                      borderRadius: "8px",
                      height: "128px",
                      border: "none",
                      color: "white",
                      outline: "none",
                      resize: "vertical",
                    }}
                    placeholder="Detailed solution..."
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Images ({currentSolution.images.length})
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                    {currentSolution.images.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          width: "80px",
                          height: "80px",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={API_BASE_URL1 + img.path}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <button
                          onClick={() => handleRemoveMedia("image", idx)}
                          style={{
                            position: "absolute",
                            top: "4px",
                            right: "4px",
                            background: "#ef4444",
                            border: "none",
                            borderRadius: "50%",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "white",
                          }}
                        >
                          <X style={{ width: "12px", height: "12px" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleFileUpload("image")}
                    style={{
                      width: "100%",
                      background: "#404040",
                      padding: "8px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.target.style.background = "#525252")}
                    onMouseOut={(e) => (e.target.style.background = "#404040")}
                  >
                    <ImageIcon style={{ width: "16px", height: "16px" }} /> Add Images (Multiple)
                  </button>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Videos ({currentSolution.videos.length})
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
                    {currentSolution.videos.map((vid, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          background: "#525252",
                          padding: "8px",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontSize: "12px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          🎥 {vid.originalName}
                        </span>
                        <button
                          onClick={() => handleRemoveMedia("video", idx)}
                          style={{
                            background: "#ef4444",
                            border: "none",
                            borderRadius: "4px",
                            padding: "0.25rem 0.5rem",
                            cursor: "pointer",
                            color: "white",
                            fontSize: "12px",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleFileUpload("video")}
                    style={{
                      width: "100%",
                      background: "#404040",
                      padding: "8px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.target.style.background = "#525252")}
                    onMouseOut={(e) => (e.target.style.background = "#404040")}
                  >
                    <VideoIcon style={{ width: "16px", height: "16px" }} /> Add Videos (Multiple)
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px", paddingTop: "16px" }}>
                  <button
                    onClick={handleSaveSolution}
                    style={{
                      flex: 1,
                      background: "#16a34a",
                      padding: "12px",
                      borderRadius: "8px",
                      fontWeight: "600",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.target.style.background = "#15803d")}
                    onMouseOut={(e) => (e.target.style.background = "#16a34a")}
                  >
                    Save Solution
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setCurrentSolution({
                        title: "",
                        keywords: "",
                        responseText: "",
                        images: [],
                        videos: [],
                      });
                    }}
                    style={{
                      flex: 1,
                      background: "#404040",
                      padding: "12px",
                      borderRadius: "8px",
                      fontWeight: "600",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => (e.target.style.background = "#525252")}
                    onMouseOut={(e) => (e.target.style.background = "#404040")}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #cdd0f8c2;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #5e96ff;
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #397efd;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #404040;
          border-top: 4px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}