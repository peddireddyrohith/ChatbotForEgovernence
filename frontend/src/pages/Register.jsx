import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser, FaIdCard, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const Register = () => {
    const [step, setStep] = useState(1); // 1: Register Form, 2: OTP Verification
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        aadhaar: ''
    });
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Validation Errors
    const [errors, setErrors] = useState({});

    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";

        // Strict Email Regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(formData.email)) newErrors.email = "Please enter a valid email address";

        if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

        if (formData.aadhaar && !/^\d{12}$/.test(formData.aadhaar)) {
            newErrors.aadhaar = "Aadhaar must be 12 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            // First call: Register to send OTP
            const { data } = await api.post('/auth/register', formData);
            if (data.devOtp) {
                alert(`DEV MODE OTP: ${data.devOtp}`);
            } else {
                alert(data.message);
            }
            setStep(2);
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifySubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/auth/verify-otp', {
                email: formData.email,
                otp
            });

            // Login specific logic (e.g. save token) handling can be done by AuthContext, 
            // but for now we essentially mimic 'login' success.
            // Ideally we auto-login or redirect to login.
            alert("Verification Successful! You can now login.");
            navigate('/login');
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm">

                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
                        {step === 1 ? 'Create Account' : 'Verify Email'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {step === 1 ? 'Join digital India governance' : `Enter the OTP sent to ${formData.email}`}
                    </p>
                </div>

                {step === 1 && (
                    <form className="mt-8 space-y-6" onSubmit={handleRegisterSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaUser className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className={`block w-full pl-10 pr-3 py-3 border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white transition-all`}
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaEnvelope className="text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className={`block w-full pl-10 pr-3 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white transition-all`}
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaLock className="text-gray-400" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className={`block w-full pl-10 pr-10 py-3 border ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white transition-all`}
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </div>
                                </div>
                                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Aadhaar Number (Optional)</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaIdCard className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className={`block w-full pl-10 pr-3 py-3 border ${errors.aadhaar ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white transition-all`}
                                        placeholder="12-digit Aadhaar"
                                        value={formData.aadhaar}
                                        onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                                    />
                                </div>
                                {errors.aadhaar && <p className="mt-1 text-xs text-red-500">{errors.aadhaar}</p>}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all transform hover:scale-[1.02]"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : 'Get OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form className="mt-8 space-y-6" onSubmit={handleVerifySubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Enter Verification Code</label>
                            <input
                                type="text"
                                required
                                maxLength="6"
                                className="mt-2 block w-full text-center text-2xl tracking-widest py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            />
                            <p className="mt-2 text-center text-sm text-gray-500">
                                Didn't receive code? <button type="button" onClick={handleRegisterSubmit} className="text-violet-600 hover:text-violet-500 font-medium">Resend</button>
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all transform hover:scale-[1.02]"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : 'Verify & Register'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                            Back to details
                        </button>
                    </form>
                )}

                <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-violet-600 hover:text-violet-500 transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
