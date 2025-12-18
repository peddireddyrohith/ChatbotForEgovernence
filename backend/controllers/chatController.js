const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Scheme = require('../models/Scheme');

// @desc    Get all conversations for a user
// @route   GET /api/chat
// @access  Private
const getConversations = async (req, res) => {
    try {
        let conversations;
        if (req.user.role === 'admin') {
            // Admin sees ALL conversations, sorted by Flagged/Priority then Date
            conversations = await Conversation.find({})
                .populate('userId', 'name email')
                .populate('assignedTo', 'name email')
                .sort({ priority: 1, updatedAt: -1 });
        } else {
            // User sees THEIR conversations
            conversations = await Conversation.find({ userId: req.user._id })
                .populate('assignedTo', 'name email') // Added populate
                .sort({ updatedAt: -1 });
        }
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/:id
// @access  Private
const getMessages = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Allow if user is owner OR admin
        if (conversation.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send a message (User -> Bot)
// @route   POST /api/chat
// @access  Private
const sendMessage = async (req, res) => {
    const { text, conversationId } = req.body;
    let chatId = conversationId;

    try {
        // Create new conversation if not provided
        if (!chatId) {
            const newConv = await Conversation.create({
                userId: req.user._id,
                title: text.substring(0, 30) + '...',
            });
            chatId = newConv._id;
        } else {
            // Verify existence and permission
            const conversation = await Conversation.findById(chatId);
            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }
            if (conversation.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(401).json({ message: 'Not authorized' });
            }
        }

        const lowerText = text.toLowerCase();
        let isSupportRequest = false;

        if (lowerText.includes('talk to human') || lowerText.includes('chat with agent') || lowerText.includes('chat with admin')) {
            isSupportRequest = true;
            await Conversation.findByIdAndUpdate(chatId, { status: 'flagged', priority: 'high' });
        }

        // Parallel Execution: Save User Message, Fetch History (for AI), AND Fetch Context (RAG)
        const [userMessage, dbHistory, foundSchemes] = await Promise.all([
            Message.create({
                conversationId: chatId,
                sender: req.user.role === 'admin' ? 'admin' : 'user',
                text,
            }),
            // Fetch LAST 10 messages for context (only if user)
            req.user.role !== 'admin'
                ? Message.find({ conversationId: chatId }).sort({ createdAt: -1 }).limit(10)
                : Promise.resolve([]),
            // Fetch relevant schemes for Context (RAG)
            req.user.role !== 'admin'
                ? Scheme.find({
                    $or: [
                        { name: { $regex: text, $options: 'i' } },
                        { description: { $regex: text, $options: 'i' } },
                        { ministry: { $regex: text, $options: 'i' } },
                        { name: { $regex: lowerText.includes('farmer') ? 'Kisan' : '_______', $options: 'i' } }
                    ]
                }).limit(2).select('name description benefits link')
                : Promise.resolve([])
        ]);

        // Emit User Message via Socket
        const io = req.app.get('io');
        io.to(chatId).emit('receive_message', userMessage);

        // Only trigger Bot if sender is User (not Admin)
        let botMessage = null;
        if (req.user.role !== 'admin') {
            // Check Live Status: If flagged/high priority, DO NOT TRIGGER BOT unless it's the initial "talk to human" request
            let currentStatus = 'active';
            try {
                const checkConv = await Conversation.findById(chatId);
                currentStatus = checkConv.status;
            } catch (e) { }

            // If user explicitly asked for support just now, we handled it above by setting flag.
            // If it was ALREADY flagged, we should just let the message sit there for the admin.
            // EXCEPT if it was the triggering message itself (isSupportRequest).

            if (isSupportRequest) {
                // If support requested, send a specific bot message and skip AI
                const supportMsg = "I have notified our support team. An admin will join this chat shortly to assist you.";
                botMessage = await Message.create({
                    conversationId: chatId,
                    sender: 'bot',
                    text: supportMsg,
                });
                io.to(chatId).emit('receive_message', botMessage);
            } else if (currentStatus === 'flagged') {
                // SILENCE THE BOT: Live Agent session is active.
                // Do nothing.
            } else {
                // ... Existing AI Logic ...
                // Call OpenRouter (Meta Llama)
                let botResponseText = "";
                try {
                    const apiKey = process.env.META_API_KEY;
                    if (!apiKey || apiKey.startsWith('sk-or-v1-3e8cc02b')) {
                        console.warn("Warning: Using placeholder or missing META_API_KEY");
                    }

                    if (!apiKey) {
                        throw new Error("Missing META_API_KEY");
                    }

                    // Format history: Reverse (to get chronological) -> Map
                    const messages = dbHistory.reverse().map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    }));

                    // Build Context String from Found Schemes
                    let contextData = "";
                    if (foundSchemes.length > 0) {
                        contextData = "\n\nRELEVANT GOVERNMENT DATA FOUND (Use this to answer):";
                        foundSchemes.forEach(s => {
                            contextData += `\n- Scheme: ${s.name}`;
                            contextData += `\n  Description: ${s.description}`;
                            contextData += `\n  Benefits: ${s.benefits.join(', ')}`;
                            contextData += `\n  Official Link: ${s.link}`;
                        });
                    }

                    // Add current message
                    messages.push({ role: "user", content: text + contextData });

                    // System prompt
                    const systemMessage = {
                        role: "system",
                        content: "You are a helpful Indian E-Governance Assistant. Provide accurate information about government schemes. \n\nIMPORTANT INSTRUCTIONS:\n1. If I provide 'RELEVANT GOVERNMENT DATA' in the input, you MUST use it.\n2. ALWAYS provide the 'Official Link' from the data as a Markdown link, e.g., `[Click to Apply](https://url...)`.\n3. Make your response clear, structured (use bullet points), and concise."
                    };

                    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": "http://localhost:5000", // Required by OpenRouter for free/low-tier
                            "X-Title": "E-Governance Chatbot" // Required by OpenRouter
                        },
                        body: JSON.stringify({
                            "model": "meta-llama/llama-3.1-8b-instruct",
                            "messages": [systemMessage, ...messages],
                            "top_p": 1,
                            "temperature": 0.5,
                            "repetition_penalty": 1,
                            "max_tokens": 600
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.text();
                        throw new Error(`OpenRouter API Error: ${response.status} - ${errorData}`);
                    }

                    const data = await response.json();
                    botResponseText = data.choices[0].message.content;

                } catch (aiError) {
                    console.error("AI/Network Error Details:", aiError);
                    if (aiError.message) console.error("Message:", aiError.message);
                    if (aiError.cause) console.error("Cause:", aiError.cause);

                    // OFFLINE / FALLBACK INTELLIGENCE
                    botResponseText = "";

                    // 1. Handle Greetings
                    const greetings = ['hello', 'hi', 'hey', 'start', 'help'];
                    if (greetings.some(g => lowerText.includes(g))) {
                        botResponseText = "👋 Hello! I am your E-Governance Assistant.\n\nI can help you with:\n- **PM Kisan Samman Nidhi**\n- **Aadhaar Card Updates**\n- **PAN Card Application**\n- **Ayushman Bharat**\n- **DigiLocker**\n\nAsk me about any scheme!";
                    } else {
                        // 2. Use the schemes we already found in parallel
                        if (foundSchemes && foundSchemes.length > 0) {
                            botResponseText = "Here is the information I found (Local DB):\n\n";
                            foundSchemes.forEach(s => {
                                botResponseText += `### ${s.name}\n${s.description}\n**Benefits:** ${s.benefits.join(', ')}\n[Official Website](${s.link})\n\n`;
                            });
                            botResponseText += "\n*(Offline Mode Active - AI Connection Failed)*";
                        } else {
                            // 3. No local data found
                            botResponseText = `I am having trouble connecting to the AI service. Please check your internet or API Key. (Error: ${aiError.message})`;
                        }
                    }
                } // End catch (AI Error)

                // Save Bot Message (Inside if !admin)
                if (botResponseText) {
                    botMessage = await Message.create({
                        conversationId: chatId,
                        sender: 'bot',
                        text: botResponseText,
                    });
                    io.to(chatId).emit('receive_message', botMessage);
                }
            }
        } // End if (!admin)

        res.json({
            conversationId: chatId,
            userMessage,
            botMessage,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a conversation
// @route   DELETE /api/chat/:id
// @access  Private
const deleteConversation = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Allow if user is owner OR admin
        if (conversation.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Message.deleteMany({ conversationId: req.params.id });
        await Conversation.findByIdAndDelete(req.params.id);

        res.json({ message: 'Conversation removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Assign chat to admin
// @route   PUT /api/chat/:id/assign
// @access  Private/Admin
const assignChatToAdmin = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        // If already assigned to SOMEONE ELSE, block it
        if (conversation.assignedTo && conversation.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: 'Chat is already assigned to another admin' });
        }

        conversation.assignedTo = req.user._id;
        conversation.assignedAt = Date.now();
        await conversation.save();

        const io = req.app.get('io');
        // Notify the specific chat room that an agent has joined
        io.to(req.params.id).emit('agent_joined', {
            agentName: req.user.name,
            agentId: req.user._id
        });

        // Also emit a system message into the chat
        const systemMsg = await Message.create({
            conversationId: conversation._id,
            sender: 'bot',
            text: `Agent ${req.user.name} has joined the chat.`
        });
        io.to(req.params.id).emit('receive_message', systemMsg);

        res.json(conversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Release chat from admin
// @route   PUT /api/chat/:id/release
// @access  Private/Admin
const releaseChatFromAdmin = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        conversation.assignedTo = null;
        conversation.assignedAt = null;
        await conversation.save();

        res.json(conversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get queue position for a flagged chat
// @route   GET /api/chat/:id/queue
// @access  Private
const getQueuePosition = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        if (conversation.status !== 'flagged') {
            return res.json({ position: 0, message: 'Not in queue' });
        }

        // Count flagged chats created/updated BEFORE this one that are NOT assigned
        // OR just count all unassigned flagged chats created before.
        // We use 'updatedAt' because flagging updates the timestamp.
        const position = await Conversation.countDocuments({
            status: 'flagged',
            assignedTo: null,
            updatedAt: { $lt: conversation.updatedAt }
        });

        // Position is index + 1
        res.json({ position: position + 1 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    End support session (User side)
// @route   PUT /api/chat/:id/end-support
// @access  Private
const endSupportSession = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        if (conversation.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        conversation.status = 'active'; // Reset to active (AI mode)
        conversation.priority = 'low';
        conversation.assignedTo = null; // Release any admin
        conversation.assignedAt = null;
        await conversation.save();

        // Notify Admin room or specific admin? 
        // We rely on polling/socket updates in frontend for now. 
        //Ideally emit socket event here if we had the io instance handy in a cleaner way, 
        //but req.app.get('io') works.
        const io = req.app.get('io');
        io.to(req.params.id).emit('support_ended', { message: 'User ended support session' });

        res.json(conversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    End support session (Admin side)
// @route   PUT /api/chat/:id/admin-end-support
// @access  Private/Admin
const adminEndSupportSession = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        // If locked by someone else
        if (conversation.assignedTo && conversation.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized. Chat is locked by another admin.' });
        }

        conversation.status = 'active'; // Back to AI
        conversation.priority = 'low';
        conversation.assignedTo = null;
        conversation.assignedAt = null;
        await conversation.save();

        const io = req.app.get('io');

        // Notify User
        const systemMsg = await Message.create({
            conversationId: conversation._id,
            sender: 'bot', // Display as bot or system
            text: "The admin has ended this support session. You are now connected to the AI assistant."
        });
        io.to(req.params.id).emit('receive_message', systemMsg);

        // Notify that support ended (to refresh UI)
        io.to(req.params.id).emit('support_ended', { message: 'Admin ended support session' });

        res.json(conversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getConversations, getMessages, sendMessage, deleteConversation, assignChatToAdmin, releaseChatFromAdmin, getQueuePosition, endSupportSession, adminEndSupportSession };
