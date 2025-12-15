class ChatBot {
    constructor() {
        this.apiBase = 'http://localhost:8000';
        this.currentFile = null;
        this.chats = [];
        this.currentChatId = 0;
        this.sessionId = Date.now().toString();
        this.initializeElements();
        this.bindEvents();
        this.autoResizeTextarea();
        this.loadChats();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');

        this.newChatBtn = document.getElementById('newChatBtn');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebar = document.querySelector('.sidebar');
        this.chatInterface = document.getElementById('chatInterface');
        this.documentsPage = document.getElementById('documentsPage');
        this.backToChat = document.getElementById('backToChat');
        this.myDocuments = document.getElementById('myDocuments');
        this.chatHistory = document.getElementById('chatHistory');
        this.userBtn = document.getElementById('userBtn');
        
        // Set user's first letter in button
        const username = localStorage.getItem('username') || 'User';
        this.userBtn.textContent = username.charAt(0).toUpperCase();
    }

    bindEvents() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.myDocuments.addEventListener('click', () => this.showDocumentsPage());
        this.backToChat.addEventListener('click', () => this.showChatInterface());
        
        // Search functionality
        document.getElementById('searchChats').addEventListener('input', (e) => this.searchChats(e.target.value));
        
        // Navigation buttons
        this.userBtn.addEventListener('click', () => this.showUserMenu());
    }

    autoResizeTextarea() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('collapsed');
    }



    async startNewChat() {
        // Save current chat if it has messages (more than just the welcome message)
        if (this.chatMessages.children.length > 1) {
            this.saveCurrentChat();
        }
        
        // Get new session from backend
        try {
            const response = await fetch(`${this.apiBase}/new-chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('user_token')}`
                }
            });
            const data = await response.json();
            this.sessionId = data.session_id;
        } catch (error) {
            console.error('Failed to create new session:', error);
            this.sessionId = Date.now().toString();
        }
        
        // Generate new chat ID
        this.currentChatId = Date.now();
        this.currentFile = null;
        
        // Completely clear and reset chat messages
        this.chatMessages.innerHTML = '';
        this.addMessage('Hello! I\'m your AI Document Companion. Upload a document and ask me questions about it, or just chat with me directly.', 'bot');
        
        // Remove active state from all existing chat items
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    }

    saveCurrentChat() {
        const messages = Array.from(this.chatMessages.children).map(msg => {
            const content = msg.querySelector('.message-content').textContent;
            const isUser = msg.classList.contains('user-message');
            return { content, isUser };
        });
        
        // Only save if there are actual user interactions (more than just welcome message)
        if (messages.length > 1 && messages.some(msg => msg.isUser)) {
            const chatName = this.generateChatName(messages);
            
            // Check if chat already exists to prevent duplicates
            const existingChatIndex = this.chats.findIndex(chat => chat.id === this.currentChatId);
            
            const chat = {
                id: this.currentChatId,
                name: chatName,
                messages: messages,
                timestamp: new Date().toISOString()
            };
            
            if (existingChatIndex >= 0) {
                // Update existing chat
                this.chats[existingChatIndex] = chat;
            } else {
                // Add new chat
                this.chats.push(chat);
            }
            
            this.saveChats();
        }
    }

    generateChatName(messages) {
        // Find the first actual question (skip upload messages)
        const firstQuestion = messages.find(msg => msg.isUser && !msg.content.startsWith('📎'));
        if (firstQuestion) {
            let name = firstQuestion.content.trim();
            // Truncate long messages
            if (name.length > 30) {
                name = name.substring(0, 30) + '...';
            }
            return name;
        }
        
        // If only upload messages, use filename
        const uploadMessage = messages.find(msg => msg.isUser && msg.content.startsWith('📎'));
        if (uploadMessage) {
            const filename = uploadMessage.content.replace('📎 Uploading ', '').replace('...', '');
            return filename;
        }
        
        return `Chat ${new Date().toLocaleDateString()}`;
    }
    
    createChatHistoryForUpload(filename) {
        // Create a chat entry immediately when file is uploaded
        const chatName = filename;
        
        // Remove any existing active chat state
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        
        // Add new active chat to history
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item active';
        chatItem.innerHTML = `
            <span class="chat-name">${chatName}</span>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteChat(this)">Delete</button>
        `;
        
        // Insert at the top of chat history
        this.chatHistory.insertBefore(chatItem, this.chatHistory.firstChild);
    }
    
    updateChatNameWithQuestion(question) {
        // Update active chat name with user's first question
        const activeChat = document.querySelector('.chat-item.active .chat-name');
        if (activeChat && activeChat.textContent.includes('.')) { // Only if it's still a filename
            let chatName = question.trim();
            if (chatName.length > 30) {
                chatName = chatName.substring(0, 30) + '...';
            }
            activeChat.textContent = chatName;
        }
    }

    addChatToHistory(name, isActive = false) {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${isActive ? 'active' : ''}`;
        chatItem.innerHTML = `
            <span class="chat-name">${name}</span>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteChat(this)">Delete</button>
        `;
        
        chatItem.addEventListener('click', () => {
            if (!isActive) {
                this.loadChat(this.currentChatId);
            }
        });
        
        this.chatHistory.insertBefore(chatItem, this.chatHistory.firstChild);
    }

    loadChats() {
        const savedChats = localStorage.getItem('aiDocumentChats');
        if (savedChats) {
            this.chats = JSON.parse(savedChats);
            this.renderChatHistory();
        }
    }

    saveChats() {
        localStorage.setItem('aiDocumentChats', JSON.stringify(this.chats));
        this.renderChatHistory();
    }

    renderChatHistory() {
        // Clear all existing chats to prevent duplication
        this.chatHistory.innerHTML = '';
        
        // Add saved chats
        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.innerHTML = `
                <span class="chat-name">${chat.name}</span>
                <button class="delete-btn" onclick="event.stopPropagation(); deleteChat(this)">Delete</button>
            `;
            
            chatItem.addEventListener('click', () => {
                this.loadChat(chat.id);
            });
            
            this.chatHistory.appendChild(chatItem);
        });
    }

    loadChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            this.currentChatId = chatId;
            this.chatMessages.innerHTML = '';
            
            chat.messages.forEach(msg => {
                this.addMessage(msg.content, msg.isUser ? 'user' : 'bot');
            });
            
            // Update active chat
            document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
            event.target.closest('.chat-item').classList.add('active');
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.showTypingIndicator();

        try {
            const response = await fetch(`${this.apiBase}/ask`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('user_token')}`
                },
                body: JSON.stringify({
                    question: message,
                    filename: this.currentFile,
                    session_id: this.sessionId
                })
            });

            const data = await response.json();
            this.hideTypingIndicator();
            
            if (data.error) {
                this.addMessage(`Error: ${data.error}`, 'bot');
            } else {
                this.addMessage(data.answer || 'No response received', 'bot');
                
                // Update chat name with first question after upload
                this.updateChatNameWithQuestion(message);
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            console.error('Error:', error);
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        this.addMessage(`📎 Uploading ${file.name}...`, 'user');
        this.showTypingIndicator();

        try {
            const response = await fetch(`${this.apiBase}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('user_token')}`
                },
                body: formData
            });

            const data = await response.json();
            this.hideTypingIndicator();

            if (data.error) {
                this.addMessage(`Upload failed: ${data.error}`, 'bot');
            } else {
                this.currentFile = data.filename;
                this.addMessage(`✅ ${file.name} uploaded successfully! You can now ask questions about this ${data.file_type}.`, 'bot');
                
                // Auto-create chat history entry for this upload
                this.createChatHistoryForUpload(file.name);
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Upload failed. Please try again.', 'bot');
            console.error('Upload error:', error);
        }

        // Reset file input
        event.target.value = '';
    }

    async showDocumentsPage() {
        this.chatInterface.style.display = 'none';
        this.documentsPage.style.display = 'flex';
        await this.loadDocuments();
    }

    showChatInterface() {
        this.documentsPage.style.display = 'none';
        this.chatInterface.style.display = 'flex';
    }

    async loadDocuments() {
        const documentsGrid = document.getElementById('documentsGrid');
        documentsGrid.innerHTML = '<div style="text-align: center; color: #6b7280;">Loading documents...</div>';

        try {
            const response = await fetch(`${this.apiBase}/documents`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('user_token')}`
                }
            });
            const data = await response.json();
            
            documentsGrid.innerHTML = '';
            
            if (data.documents && data.documents.length > 0) {
                data.documents.forEach(doc => {
                    const docCard = document.createElement('div');
                    docCard.className = 'document-card';
                    
                    const icon = this.getFileIcon(doc.filename);
                    const date = new Date(doc.upload_date).toLocaleDateString();
                    
                    docCard.innerHTML = `
                        <div class="document-icon">${icon}</div>
                        <div class="document-name">${doc.filename}</div>
                        <div class="document-date">${date}</div>
                    `;
                    
                    docCard.addEventListener('click', () => {
                        this.currentFile = doc.filename;
                        this.showChatInterface();
                        this.addMessage(`📄 Selected document: ${doc.filename}`, 'bot');
                    });
                    
                    documentsGrid.appendChild(docCard);
                });
            } else {
                documentsGrid.innerHTML = '<div class="no-documents">No documents found. Upload some documents to get started!</div>';
            }
        } catch (error) {
            documentsGrid.innerHTML = '<div class="no-documents">Unable to load documents.</div>';
            console.error('Error loading documents:', error);
        }
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': '📄',
            'docx': '📝',
            'doc': '📝',
            'txt': '📄',
            'pptx': '📊',
            'ppt': '📊',
            'xlsx': '📈',
            'xls': '📈',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'png': '🖼️',
            'gif': '🖼️'
        };
        return iconMap[ext] || '📄';
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        messageContent.innerHTML = formattedContent;
        
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        typingDiv.id = 'typing-indicator';
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    // Search chats functionality
    searchChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            const text = item.querySelector('.chat-name').textContent.toLowerCase();
            item.style.display = text.includes(query.toLowerCase()) ? 'flex' : 'none';
        });
    }
    

    
    // Show user menu
    showUserMenu() {
        const username = localStorage.getItem('username') || 'User';
        this.addMessage(`👤 **${username}**\n\n• Profile Settings\n• Usage Statistics\n• Export Data\n• Help & Support\n• [Logout](javascript:logout())`, 'bot');
    }
}

// Global functions for chat menu
function toggleChatMenu(element) {
    const dropdown = element.querySelector('.chat-dropdown');
    // Close all other dropdowns
    document.querySelectorAll('.chat-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('show');
    });
    dropdown.classList.toggle('show');
}

function deleteChat(element) {
    const chatItem = element.closest('.chat-item');
    const chatName = chatItem.querySelector('.chat-name').textContent;
    
    // If it's the active chat, start a new one
    if (chatItem.classList.contains('active')) {
        window.chatBot.startNewChat();
    }
    
    // Remove from saved chats
    const chatIndex = window.chatBot.chats.findIndex(chat => chat.name === chatName);
    if (chatIndex > -1) {
        window.chatBot.chats.splice(chatIndex, 1);
        window.chatBot.saveChats();
    }
    
    chatItem.remove();
}

function selectFileType(type) {
    if (type === 'image') {
        document.getElementById('imageInput').click();
    } else if (type === 'document') {
        document.getElementById('documentInput').click();
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.chat-menu')) {
        document.querySelectorAll('.chat-dropdown').forEach(d => d.classList.remove('show'));
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('user_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    window.chatBot = new ChatBot();
});

// Logout function
function logout() {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}