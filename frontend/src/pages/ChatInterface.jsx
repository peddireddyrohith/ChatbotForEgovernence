import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import ChatBubble from '../components/ChatBubble';
import { FaPaperPlane, FaPlus, FaComments, FaTrash, FaExclamationCircle, FaCheck } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';

const ENDPOINT = API_BASE_URL;
let socket;

const ChatInterface = () => {
    const { user } = useAuth();
    const { id: paramChatId } = useParams();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(paramChatId || null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // NEW Feature States
    const [queuePosition, setQueuePosition] = useState(0);
    const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
    const [complaintForm, setComplaintForm] = useState({ title: '', description: '', category: 'general', priority: 'medium' });

    const messagesEndRef = useRef(null);
    const currentChatIdRef = useRef(currentChatId);

    useEffect(() => {
        currentChatIdRef.current = currentChatId;
    }, [currentChatId]);

    // Socket & Initial Data
    useEffect(() => {
        if (user) {
            socket = io(ENDPOINT);
            socket.emit('join_chat', user._id);

            socket.on('receive_message', (newMessage) => {
                if (currentChatIdRef.current === newMessage.conversationId) {
                    setMessages((prev) => {
                        if (prev.some(m => m._id === newMessage._id)) return prev;
                        return [...prev, newMessage];
                    });

                    const myRole = user.role === 'admin' ? 'admin' : 'user';
                    if (newMessage.sender !== myRole) {
                        setIsTyping(false);
                    }
                }
                // Refresh conversations locally to update status (e.g. flagged)
                fetchConversations();
            });

            socket.on('typing', ({ room }) => {
                if (currentChatIdRef.current === room) setIsTyping(true);
            });

            // Handle support ended event (real-time)
            socket.on('support_ended', ({ message }) => {
                console.log("Socket: Support Ended", message);
                fetchConversations();
                if (user.role === 'admin') {
                    // Force a re-fetch of messages too if we are in that chat
                    if (currentChatIdRef.current) fetchMessages(currentChatIdRef.current);

                    Swal.fire({
                        title: 'Support Session Ended',
                        text: message || 'User has ended the support session.',
                        icon: 'info',
                        timer: 5000,
                        position: 'top-end',
                        toast: true,
                        showConfirmButton: false
                    });
                }
            });

            // Handle Agent Joined (to hide queue banner for user)
            socket.on('agent_joined', ({ agentName }) => {
                console.log("Socket: Agent Joined", agentName);
                fetchConversations(); // Logic inside here should handle queuePosition based on assignedTo

                // FORCE clear queue position immediately
                if (user.role !== 'admin') {
                    setQueuePosition(0);
                    Swal.fire({
                        title: 'Agent Connected',
                        text: `${agentName} has joined the chat!`,
                        icon: 'success',
                        toast: true,
                        position: 'top-center',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            });

            fetchConversations();

            if (user.role !== 'admin') {
                const fetchConvs = async () => {
                    try {
                        const config = { headers: { Authorization: `Bearer ${user.token}` } };
                        const { data } = await api.get('/chat', config);
                        setConversations(data);
                    } catch (error) { console.error(error); }
                };
                fetchConvs();
            }
        }
        return () => {
            if (socket) socket.disconnect();
        };
    }, [user]);

    // Handle Route Change
    useEffect(() => {
        if (paramChatId) {
            setCurrentChatId(paramChatId);
        } else {
            setCurrentChatId(null);
        }
    }, [paramChatId]);

    // Fetch Messages & Queue
    useEffect(() => {
        if (currentChatId) {
            fetchMessages(currentChatId);
            socket.emit('join_chat', currentChatId);
        }
    }, [currentChatId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get('/chat', config);
            setConversations(data);

            // Check Queue Position only if we have a current chat 
            if (currentChatIdRef.current) {
                const currentChat = data.find(c => c._id === currentChatIdRef.current);
                if (currentChat?.status === 'flagged' && !currentChat.assignedTo) {
                    const qRes = await api.get(`/chat/${currentChatIdRef.current}/queue`, config);
                    setQueuePosition(qRes.data.position);
                } else {
                    setQueuePosition(0);
                }
            }
        } catch (error) {
            console.error("Error fetching conversations:", error);
        }
    };

    const fetchMessages = async (chatId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            setIsLoadingMessages(true);
            const { data } = await api.get(`/chat/${chatId}`, config);
            setMessages(data);
        } catch (error) {
            console.error("Error fetching messages:", error);
            setMessages([]);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e, customText = null) => {
        if (e) e.preventDefault();
        const textToSend = customText || newMessage;

        if (!textToSend.trim()) return;

        try {
            setNewMessage('');
            setIsTyping(true); // Optimistic UI

            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.post('/chat', {
                text: textToSend,
                conversationId: currentChatId
            }, config);

            // Handle new chat creation
            if (!currentChatId) {
                setCurrentChatId(data.conversationId);
                fetchConversations();
                navigate(`/chat/${data.conversationId}`);
            }

            const newMsgs = [data.userMessage];
            if (data.botMessage) newMsgs.push(data.botMessage);

            setMessages((prev) => {
                const existingIds = new Set(prev.map(m => m._id));
                const uniqueNew = newMsgs.filter(m => !existingIds.has(m._id));
                return [...prev, ...uniqueNew];
            });
            setIsTyping(false);

            // Broadcast typing stop just in case
            socket.emit('stop_typing', { room: currentChatId });

            // Force refresh of conversations to update status (e.g. if user just requested human agent)
            fetchConversations();

        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message: " + (error.response?.data?.message || "Server not reachable"));
            setIsTyping(false);
        }
    };

    // Typing Debounce
    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!currentChatId) return;

        // Emit typing event
        socket.emit('typing', { room: currentChatId });

        // Clear existing timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Set new timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { room: currentChatId });
        }, 2000);
    };
    const typingTimeoutRef = useRef(null);

    const getSuggestions = () => {
        if (messages.length === 0) return ['Check Aadhaar Status', 'File a Complaint', 'Farmer Schemes', 'Apply for PAN Card', 'Talk to Human Agent'];

        const lastMsg = messages[messages.length - 1];
        if (lastMsg.sender === 'user') return [];

        const text = lastMsg.text.toLowerCase();
        if (text.includes('kisan')) return ['Check PM Kisan Status', 'Am I eligible?', 'Apply for PM Kisan', 'Talk to Human Agent'];
        if (text.includes('aadhaar')) return ['Update Address', 'Link PAN with Aadhaar', 'Download Aadhaar', 'Talk to Human Agent'];
        if (text.includes('pan')) return ['Apply New PAN', 'Correction in PAN', 'Track Status', 'Talk to Human Agent'];

        return ['Main Menu', 'Talk to Human Agent', 'Help'];
    };

    const createNewChat = () => {
        setCurrentChatId(null);
        setMessages([]);
        navigate('/chat');
    };

    const handleFileComplaint = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.post('/complaints', complaintForm, config);

            await Swal.fire({
                title: 'Success!',
                text: 'Complaint Submitted Successfully',
                icon: 'success',
                confirmButtonColor: '#3085d6'
            });

            setIsComplaintModalOpen(false);
            setComplaintForm({ title: '', description: '', category: 'general', priority: 'medium' });
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to submit complaint', 'error');
        }
    };

    const handleSuggestionClick = (suggestion) => {
        if (suggestion.toLowerCase().includes('complaint') || suggestion.toLowerCase().includes('complain')) {
            setIsComplaintModalOpen(true);
        } else {
            handleSendMessage(null, suggestion);
        }
    };

    const deleteChat = async () => {
        if (!currentChatId) return;

        const result = await Swal.fire({
            title: 'Delete this chat?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await api.delete(`/chat/${currentChatId}`, config);
                await Swal.fire('Deleted!', 'Your chat has been deleted.', 'success');
                if (user.role !== 'admin') fetchConversations();
                createNewChat();
            } catch (error) {
                Swal.fire('Error', "Failed to delete chat: " + (error.response?.data?.message || error.message), 'error');
            }
        }
    };

    const deleteSpecificChat = async (e, chatId) => {
        e.stopPropagation();
        const result = await Swal.fire({
            title: 'Delete chat history?',
            text: "This cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await api.delete(`/chat/${chatId}`, config);
                if (currentChatId === chatId) createNewChat();
                if (user.role !== 'admin') fetchConversations();
                Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            } catch (error) {
                Swal.fire('Error', "Failed to delete chat", 'error');
            }
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-gray-700">
            {/* Sidebar */}
            <div className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-gray-700 flex flex-col hidden md:flex">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={createNewChat} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all">
                        <FaPlus /> New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {conversations.map((chat) => (
                        <div
                            key={chat._id}
                            onClick={() => setCurrentChatId(chat._id)}
                            className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${currentChatId === chat._id
                                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${chat.status === 'flagged' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400'}`}>
                                    {chat.status === 'flagged' ? <FaExclamationCircle /> : <FaComments />}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate pr-2">
                                            {chat.userId?.name ? `${chat.userId.name}: ` : ''}{chat.title}
                                        </h4>
                                        {chat.assignedTo && (
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                {chat.assignedTo._id === user._id ? 'Yours' : chat.assignedTo.name?.split(' ')[0]}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(chat.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => deleteSpecificChat(e, chat._id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all z-10"
                                    title="Delete Chat"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col relative">

                {/* User 'End Support' Button (ABSOLUTE POSITIONED) */}
                {user.role !== 'admin' && conversations.find(c => c._id === currentChatId)?.status === 'flagged' && (
                    <div className="absolute top-20 right-6 z-10 animate-fade-in-down">
                        <button
                            onClick={async () => {
                                const res = await Swal.fire({
                                    title: 'End Support Session?',
                                    text: "This will switch you back to the AI assistant.",
                                    icon: 'question',
                                    showCancelButton: true,
                                    confirmButtonColor: '#3085d6',
                                    cancelButtonColor: '#d33',
                                    confirmButtonText: 'Yes, End Support'
                                });
                                if (res.isConfirmed) {
                                    try {
                                        const config = { headers: { Authorization: `Bearer ${user.token}` } };
                                        await api.put(`/chat/${currentChatId}/end-support`, {}, config);
                                        fetchConversations();
                                        Swal.fire('Ended', 'Support session ended.', 'success');
                                    } catch (e) { console.error(e); }
                                }
                            }}
                            className="bg-red-100 hover:bg-red-200 text-red-700 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm transition-all border border-red-200 flex items-center gap-1"
                        >
                            <FaComments className="text-[10px]" /> End Support
                        </button>
                    </div>
                )}

                <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center z-20 relative shadow-sm">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                        {currentChatId ? 'Chat Session' : 'New Chat'}
                    </h3>

                    {/* Admin Controls */}
                    <div className="flex items-center gap-2">
                        {user?.role === 'admin' && (() => {
                            const currentChat = conversations.find(c => c._id === currentChatId);
                            const isAssignedToMe = currentChat?.assignedTo?._id === user._id;
                            const isAssignedToOther = currentChat?.assignedTo && !isAssignedToMe;
                            const isFlagged = currentChat?.status === 'flagged';

                            return (
                                <div className="flex items-center gap-2">
                                    {isFlagged && !currentChat?.assignedTo && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                                                    await api.put(`/chat/${currentChatId}/assign`, {}, config);
                                                    fetchConversations();
                                                } catch (err) { alert(err.response?.data?.message || "Failed to join"); }
                                            }}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full text-sm font-medium transition-colors"
                                        >
                                            Take Ownership
                                        </button>
                                    )}

                                    {isAssignedToOther && (
                                        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium border border-gray-200 flex items-center gap-1">
                                            <FaExclamationCircle /> Locked: {currentChat?.assignedTo?.name}
                                        </span>
                                    )}

                                    {isAssignedToMe && (
                                        <button
                                            onClick={async () => {
                                                const res = await Swal.fire({
                                                    title: 'End Support Session?',
                                                    text: "This will notify the user and return them to the AI assistant.",
                                                    icon: 'warning',
                                                    showCancelButton: true,
                                                    confirmButtonColor: '#3085d6',
                                                    cancelButtonColor: '#d33',
                                                    confirmButtonText: 'Yes, End Session'
                                                });

                                                if (res.isConfirmed) {
                                                    try {
                                                        const config = { headers: { Authorization: `Bearer ${user.token}` } };
                                                        // Use new atomic endpoint
                                                        await api.put(`/chat/${currentChatId}/admin-end-support`, {}, config);

                                                        fetchConversations();
                                                        Swal.fire('Session Ended', 'The support session has been closed successfully.', 'success');
                                                    } catch (err) {
                                                        console.error(err);
                                                        Swal.fire('Error', err.response?.data?.message || "Failed to end session", 'error');
                                                    }
                                                }
                                            }}
                                            className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-full text-sm font-medium transition-colors border border-green-200 flex items-center gap-1"
                                        >
                                            <FaCheck className="text-xs" /> End Session
                                        </button>
                                    )}
                                </div>
                            );
                        })()}

                        <button onClick={deleteChat} title="Delete Conversation" className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                            <FaTrash />
                        </button>
                    </div>
                </div>

                {/* Queue Notification Pane */}
                {queuePosition > 0 && user.role !== 'admin' && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-100 dark:border-yellow-800 p-2 text-center animate-pulse">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium flex items-center justify-center gap-2">
                            <div className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                            </div>
                            Waiting for agent... Position in queue: <span className="font-bold text-lg">{queuePosition}</span>
                        </p>
                    </div>
                )}

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isLoadingMessages ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8 text-center animate-fade-in-up">
                            <img src="https://cdn-icons-png.flaticon.com/512/8943/8943377.png" alt="No Messages" className="w-24 h-24 mb-6 opacity-60" />
                            <h3 className="text-2xl font-bold mb-2 text-gray-700 dark:text-gray-200">How can I help you today?</h3>
                            <p className="mb-8">Select a common topic below or start typing.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full">
                                {['Check Aadhaar Status', 'File a Complaint', 'Farmer Schemes', 'Apply for PAN Card', 'Talk to Human Agent'].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-sm font-medium"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <ChatBubble key={msg._id} message={msg} currentUser={user} />
                            ))}

                            {isTyping && (
                                <div className="flex justify-start mb-4">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-gray-200 dark:border-gray-700 shadow-sm flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}

                            {!isTyping && messages.length > 0 && user?.role !== 'admin' &&
                                (() => {
                                    const currentChat = conversations.find(c => c._id === currentChatId);
                                    // STRICT CHECK: If flagged, DO NOT SHOW SUGGESTIONS
                                    if (currentChat?.status === 'flagged') return null;

                                    return (
                                        <div className="flex flex-wrap gap-2 mt-4 ml-2 animate-fade-in">
                                            <span className="text-xs text-gray-400 w-full mb-1">Suggested Follow-ups:</span>
                                            {getSuggestions().map((sugg, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSuggestionClick(sugg)}
                                                    className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800"
                                                >
                                                    {sugg}
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()
                            }
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700">
                    <form onSubmit={handleSendMessage} className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setIsComplaintModalOpen(true)}
                            className="p-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            title="File Complaint"
                        >
                            <FaExclamationCircle size={20} />
                        </button>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={handleTyping}
                            placeholder="Type a message..."
                            className="flex-1 p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isTyping}
                            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FaPaperPlane />
                        </button>
                    </form>
                </div>
            </div>

            {/* Complaint Modal */}
            {isComplaintModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">File a Complaint</h2>
                            <button onClick={() => setIsComplaintModalOpen(false)} className="text-gray-500 hover:text-gray-700">&times;</button>
                        </div>
                        <form onSubmit={handleFileComplaint} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                <input type="text" required value={complaintForm.title} onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea required value={complaintForm.description} onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-white" rows="3"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                                <select value={complaintForm.priority} onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-white">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Submit Complaint</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;
