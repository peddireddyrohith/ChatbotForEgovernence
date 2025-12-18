
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { motion } from 'framer-motion';

const Settings = () => {
    const { user, login } = useAuth(); // Re-using login to update local state if needed, or we might need a setUser update
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (password && password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const { data } = await api.put(
                '/auth/profile',
                { name, email, password },
                config
            );

            setMessage('Profile Updated Successfully');
            setError('');
            // Optional: Update global user state (requires AuthContext update or simple reload)
            // For now, simple alert
        } catch (err) {
            setError(err.response?.data?.message || 'Update failed');
            setMessage('');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8"
            >
                <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">User Settings</h2>

                {message && <div className="p-4 mb-4 text-green-700 bg-green-100 rounded">{message}</div>}
                {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">{error}</div>}

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>

                    <div className="pt-4 border-t dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Change Password</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    placeholder="Leave blank to keep current"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:-translate-y-1"
                    >
                        Update Profile
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default Settings;
