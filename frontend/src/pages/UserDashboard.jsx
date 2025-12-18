import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FaHistory, FaUserCircle, FaEnvelope, FaCalendarAlt, FaShieldAlt, FaComments } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const UserDashboard = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [complaints, setComplaints] = useState([]);

    // Modal States
    const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false); // For Creating
    const [selectedComplaint, setSelectedComplaint] = useState(null); // For Viewing Details (The "Large Card")

    const [complaintForm, setComplaintForm] = useState({ title: '', description: '', category: 'general', priority: 'medium' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };

                const chatsRes = await api.get('/chat', config);
                setConversations(chatsRes.data);

                const complaintsRes = await api.get('/complaints', config);
                setComplaints(complaintsRes.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchData();
    }, [user]);

    const handleFileComplaint = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.post('/complaints', complaintForm, config);
            alert('Complaint Submitted Successfully');
            setIsComplaintModalOpen(false);
            setComplaintForm({ title: '', description: '', category: 'general', priority: 'medium' });
            // Refresh
            const res = await api.get('/complaints', config);
            setComplaints(res.data);
        } catch (error) {
            console.error(error);
            alert('Failed to submit complaint');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto pt-20">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 mb-8">My Dashboard</h1>

                <div className="grid md:grid-cols-12 gap-6 mb-8">
                    {/* Profile Card */}
                    <div className="md:col-span-4 glass-strong p-6 rounded-2xl">
                        <div className="text-center mb-6">
                            <div className="w-24 h-24 bg-violet-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-600 dark:text-violet-400">
                                <FaUserCircle className="text-5xl" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</h2>
                            <p className="text-gray-500 dark:text-gray-400 capitalize bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full inline-block mt-2 text-sm">{user.role}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                <FaEnvelope className="text-violet-500" />
                                <span>{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                <FaShieldAlt className="text-green-500" />
                                <span>Status: Active</span>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <Link to="/settings" className="block text-center px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                Edit Profile
                            </Link>
                            <Link to="/chat" className="block text-center px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all">
                                New Chat
                            </Link>
                        </div>
                    </div>

                    {/* Stats & Activity */}
                    <div className="md:col-span-8 space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                                <div className="p-4 bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <FaHistory className="text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Conversations</h3>
                                    <p className="text-3xl font-bold text-gray-800 dark:text-white">{conversations.length}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                                <div className="p-4 bg-purple-100 dark:bg-slate-700 text-purple-600 dark:text-purple-400 rounded-xl">
                                    <FaCalendarAlt className="text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Overview</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Track your grievance history and AI interactions.</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="glass-strong rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Recent Activities</h2>
                                <Link to="/chat" className="text-violet-600 hover:text-violet-700 text-sm font-medium">View All</Link>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {conversations.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-gray-500 mb-4">You haven't started any conversations yet.</p>
                                        <Link to="/chat" className="inline-block px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Start Chatting</Link>
                                    </div>
                                ) : (
                                    conversations.slice(0, 3).map((chat) => (
                                        <div key={chat._id} className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex justify-between items-center group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-violet-50 dark:bg-violet-900/10 text-violet-600 rounded-lg">
                                                    <FaComments />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-800 dark:text-white mb-1 group-hover:text-violet-600 transition-colors">{chat.title}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(chat.updatedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Link to={`/chat/${chat._id}`} className="px-4 py-2 text-sm bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors">
                                                Resume
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Complaints Section */}
                <div className="glass-strong rounded-2xl p-6 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">My Complaints & Issues</h2>
                        <button
                            onClick={() => setIsComplaintModalOpen(true)}
                            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
                        >
                            + File New Complaint
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {complaints.length === 0 ? (
                            <p className="text-gray-500 col-span-full text-center py-4 bg-gray-50 dark:bg-slate-700/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">No complaints history found.</p>
                        ) : (
                            complaints.map(complaint => (
                                <motion.div
                                    key={complaint._id}
                                    layoutId={complaint._id}
                                    onClick={() => setSelectedComplaint(complaint)}
                                    className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-700/30 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${complaint.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {complaint.status}
                                        </span>
                                        <span className="text-xs text-gray-400">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-white mb-2 truncate group-hover:text-violet-600 transition-colors">{complaint.title}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{complaint.description}</p>

                                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize bg-gray-200 dark:bg-slate-600 px-2 py-0.5 rounded">
                                            {complaint.category}
                                        </span>
                                        <span className="text-xs text-blue-500 font-medium group-hover:underline">View Details</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Create Complaint Modal */}
            {isComplaintModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">File a Complaint</h3>
                            <button onClick={() => setIsComplaintModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleFileComplaint} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={complaintForm.title}
                                    onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                                    className="w-full p-3 border rounded-xl dark:bg-slate-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                    placeholder="Brief title of the issue"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                                <select
                                    value={complaintForm.category}
                                    onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                                    className="w-full p-3 border rounded-xl dark:bg-slate-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                >
                                    <option value="general">General</option>
                                    <option value="technical">Technical</option>
                                    <option value="scheme-related">Scheme Related</option>
                                    <option value="harassment">Harassment</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                                <textarea
                                    required
                                    value={complaintForm.description}
                                    onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                                    className="w-full p-3 border rounded-xl dark:bg-slate-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                    rows="4"
                                    placeholder="Describe your issue in detail..."
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsComplaintModalOpen(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/30">Submit Complaint</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Complaint Details Modal (Large Card) */}
            <AnimatePresence>
                {selectedComplaint && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div
                            layoutId={selectedComplaint._id}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{selectedComplaint.title}</h2>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedComplaint.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {selectedComplaint.status}
                                            </span>
                                            <span className="text-sm text-gray-500">ID: {selectedComplaint._id}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedComplaint(null)}
                                        className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        &times;
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
                                            <p className="font-medium text-gray-800 dark:text-white capitalize">{selectedComplaint.category}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Date Submitted</label>
                                            <p className="font-medium text-gray-800 dark:text-white">{new Date(selectedComplaint.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Description</label>
                                        <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-xl text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {selectedComplaint.description}
                                        </div>
                                    </div>

                                    {selectedComplaint.resolution && (
                                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900 p-6 rounded-xl">
                                            <h4 className="flex items-center gap-2 font-bold text-green-800 dark:text-green-400 mb-2">
                                                <FaShieldAlt /> Resolution Provided
                                            </h4>
                                            <p className="text-green-700 dark:text-green-300">
                                                {selectedComplaint.resolution}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                    <button
                                        onClick={() => setSelectedComplaint(null)}
                                        className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-xl font-medium transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserDashboard;
