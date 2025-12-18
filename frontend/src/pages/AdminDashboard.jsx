import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FaUsers, FaComments, FaChartLine, FaEdit, FaTrash, FaPlus, FaCheck, FaShieldAlt } from 'react-icons/fa';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ users: 0, conversations: 0, messages: 0 });
    const [usersList, setUsersList] = useState([]);
    const [conversationsList, setConversationsList] = useState([]);
    const [schemesList, setSchemesList] = useState([]);
    const [complaintsList, setComplaintsList] = useState([]);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('overview');



    // Scheme Modal State
    const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
    const [currentScheme, setCurrentScheme] = useState(null); // If null, mode is ADD
    const [schemeFormData, setSchemeFormData] = useState({
        name: '', description: '', ministry: '', benefits: '', link: ''
    });

    useEffect(() => {
        if (user && user.token) {
            fetchAllData();
            // Polling for real-time updates (every 10 seconds)
            const interval = setInterval(fetchAllData, 10000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchAllData = () => {
        fetchStats();
        fetchUsers();
        fetchConversations();
        fetchSchemes();
        fetchComplaints();
    };

    const fetchStats = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get('/admin/stats', config);
            setStats(data);
        } catch (error) { console.error(error); }
    };

    const fetchUsers = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get('/admin/users', config);
            setUsersList(data);
        } catch (error) { console.error(error); }
    };

    const fetchConversations = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get('/admin/conversations', config);
            setConversationsList(data);
        } catch (error) { console.error(error); }
    };

    const fetchSchemes = async () => {
        try {
            const { data } = await api.get('/schemes');
            setSchemesList(data);
        } catch (error) { console.error(error); }
    };

    const fetchComplaints = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get('/complaints', config);
            setComplaintsList(data);
        } catch (error) { console.error(error); }
    };



    const handleResolveComplaint = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.put(`/complaints/${id}`, { status: 'resolved' }, config);
            fetchComplaints();
        } catch (error) { console.error(error); }
    };

    // Scheme Handlers
    const handleOpenSchemeModal = (scheme = null) => {
        if (scheme) {
            setCurrentScheme(scheme);
            setSchemeFormData({
                name: scheme.name,
                description: scheme.description,
                ministry: scheme.ministry || '',
                benefits: scheme.benefits.join(', '),
                link: scheme.link || ''
            });
        } else {
            setCurrentScheme(null);
            setSchemeFormData({ name: '', description: '', ministry: '', benefits: '', link: '' });
        }
        setIsSchemeModalOpen(true);
    };

    const handleSaveScheme = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = {
                ...schemeFormData,
                benefits: schemeFormData.benefits.split(',').map(b => b.trim()).filter(b => b)
            };

            if (currentScheme) {
                await api.put(`/schemes/${currentScheme._id}`, payload, config);
            } else {
                await api.post(`/schemes`, payload, config);
            }
            setIsSchemeModalOpen(false);
            fetchSchemes();
        } catch (error) {
            console.error("Error saving scheme", error);
            alert("Failed to save scheme");
        }
    };

    const handleDeleteScheme = async (id) => {
        if (window.confirm("Are you sure you want to delete this scheme?")) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await api.delete(`/schemes/${id}`, config);
                fetchSchemes();
            } catch (error) { console.error(error); }
        }
    };

    // Filter conversations based on search
    const filteredConversations = conversationsList.filter(chat => {
        const search = searchTerm.toLowerCase();
        const userName = chat.userId?.name?.toLowerCase() || '';
        const userEmail = chat.userId?.email?.toLowerCase() || '';
        return userName.includes(search) || userEmail.includes(search);
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 relative">
            <div className="max-w-7xl mx-auto pt-20">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">Admin Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage users, schemes, and monitor system performance.</p>
                    </div>
                    <button
                        onClick={fetchAllData}
                        className="px-4 py-2 bg-white dark:bg-slate-800 text-blue-600 border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition"
                    >
                        Refresh Data
                    </button>
                </header>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-strong p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-purple-100 text-purple-600 rounded-lg text-2xl"><FaUsers /></div>
                            <div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm">Total Users</h3>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.users}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-100 text-blue-600 rounded-lg text-2xl"><FaComments /></div>
                            <div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm">Total Conversations</h3>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.conversations}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-green-100 text-green-600 rounded-lg text-2xl"><FaChartLine /></div>
                            <div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm">Total Messages</h3>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.messages}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Support Queue (Visible if flagged chats exist) */}
                {conversationsList.some(c => c.status === 'flagged') && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Live Support Requests
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {conversationsList.filter(c => c.status === 'flagged').map(chat => {
                                const isLocked = chat.assignedTo && chat.assignedTo._id !== user._id;
                                const isMyChat = !chat.assignedTo || chat.assignedTo._id === user._id;

                                return (
                                    <div key={chat._id} className="relative">
                                        <Link
                                            to={!isLocked ? `/chat/${chat._id}` : '#'}
                                            className={`block bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl hover:shadow-md transition-all flex flex-col justify-between h-full ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                            onClick={(e) => isLocked && e.preventDefault()}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-semibold text-gray-800 dark:text-gray-100">{chat.userId?.name || 'Unknown User'}</div>
                                                        {isLocked && (
                                                            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full border border-gray-300 flex items-center gap-1">
                                                                <FaShieldAlt size={10} /> Locked: {chat.assignedTo.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-red-600 dark:text-red-400 truncate max-w-[200px]">{chat.title}</div>
                                                </div>
                                            </div>

                                            <div className="mt-2 self-end">
                                                {isMyChat ? (
                                                    <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider transition-colors">
                                                        Join
                                                    </div>
                                                ) : (
                                                    <div className="px-3 py-1 bg-gray-300 text-gray-500 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                                                        <FaShieldAlt /> Locked
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="glass-strong rounded-xl overflow-hidden">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex -mb-px overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`whitespace-nowrap py-4 px-6 font-medium text-sm transition-colors border-b-2 ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                User Management ({usersList.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('conversations')}
                                className={`whitespace-nowrap py-4 px-6 font-medium text-sm transition-colors border-b-2 ${activeTab === 'conversations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Conversations ({conversationsList.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('complaints')}
                                className={`whitespace-nowrap py-4 px-6 font-medium text-sm transition-colors border-b-2 ${activeTab === 'complaints' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Complaints ({complaintsList.filter(c => c.status !== 'resolved').length})
                            </button>
                            <button
                                onClick={() => setActiveTab('schemes')}
                                className={`whitespace-nowrap py-4 px-6 font-medium text-sm transition-colors border-b-2 ${activeTab === 'schemes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Schemes ({schemesList.length})
                            </button>

                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-slate-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {usersList.map((usr) => (
                                            <tr key={usr._id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{usr.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{usr.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${usr.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {usr.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(usr.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'conversations' && (
                            <div>
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        placeholder="Search by User Name or Email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full md:w-1/3 p-2 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-slate-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Updated</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredConversations.map((chat) => (
                                                <tr key={chat._id} className={chat.status === 'flagged' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        {chat.status === 'flagged' ? (
                                                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold animate-pulse">Support Req</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
                                                        )}
                                                        {chat.assignedTo && chat.assignedTo._id !== user._id && (
                                                            <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold flex items-center gap-1 inline-flex">
                                                                <FaShieldAlt className="text-[10px]" /> Locked: {chat.assignedTo.name}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{chat.userId?.name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{chat.userId?.email || 'N/A'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(chat.updatedAt).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        {(!chat.assignedTo || chat.assignedTo._id === user._id) ? (
                                                            <Link to={`/chat/${chat._id}`} className="text-blue-600 hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full">Open Chat</Link>
                                                        ) : (
                                                            <span className="text-gray-400 bg-gray-100 px-3 py-1 rounded-full cursor-not-allowed">Locked</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'schemes' && (
                            <div>
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => handleOpenSchemeModal()}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                    >
                                        <FaPlus /> Add New Scheme
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-slate-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Scheme Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ministry</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Benefits</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Link</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {schemesList.map((scheme) => (
                                                <tr key={scheme._id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{scheme.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{scheme.ministry}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{scheme.benefits.join(', ')}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500">
                                                        {scheme.link && <a href={scheme.link} target="_blank" rel="noreferrer">View</a>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                                                        <button onClick={() => handleOpenSchemeModal(scheme)} className="text-yellow-500 hover:text-yellow-600"><FaEdit /></button>
                                                        <button onClick={() => handleDeleteScheme(scheme._id)} className="text-red-500 hover:text-red-600"><FaTrash /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'complaints' && (
                            <div>
                                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">User Complaints</h3>
                                <div className="space-y-4">
                                    {complaintsList.length === 0 ? (
                                        <p className="text-gray-500">No complaints found.</p>
                                    ) : (
                                        complaintsList.map(complaint => (
                                            <div key={complaint._id} className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 flex flex-col md:flex-row justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${complaint.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
                                                            {complaint.priority}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${complaint.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                            {complaint.status}
                                                        </span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(complaint.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-gray-800 dark:text-white text-lg">{complaint.title}</h4>
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{complaint.description}</p>
                                                    <div className="text-xs text-gray-500 mt-2">
                                                        From: {complaint.userId?.name || 'Unknown'} ({complaint.userId?.email})
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {complaint.status !== 'resolved' && (
                                                        <button
                                                            onClick={() => handleResolveComplaint(complaint._id)}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                                                        >
                                                            <FaCheck /> Mark Resolved
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}


                    </div>
                </div>
            </div>

            {/* Scheme Modal */}
            {isSchemeModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 animate-fadeIn">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{currentScheme ? 'Edit Scheme' : 'Add New Scheme'}</h2>
                            <button onClick={() => setIsSchemeModalOpen(false)} className="text-gray-500 hover:text-gray-700">&times;</button>
                        </div>
                        <form onSubmit={handleSaveScheme} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scheme Name</label>
                                <input type="text" required value={schemeFormData.name} onChange={(e) => setSchemeFormData({ ...schemeFormData, name: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea required value={schemeFormData.description} onChange={(e) => setSchemeFormData({ ...schemeFormData, description: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-white" rows="3"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ministry</label>
                                <input type="text" value={schemeFormData.ministry} onChange={(e) => setSchemeFormData({ ...schemeFormData, ministry: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benefits (comma separated)</label>
                                <input type="text" value={schemeFormData.benefits} onChange={(e) => setSchemeFormData({ ...schemeFormData, benefits: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-white" placeholder="Benefit 1, Benefit 2..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Official Link</label>
                                <input type="text" value={schemeFormData.link} onChange={(e) => setSchemeFormData({ ...schemeFormData, link: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsSchemeModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{currentScheme ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
